import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Me } from '@/lib/types';

type AuthState = { user: Me | null; loading: boolean };

const authStore = vi.hoisted(() => {
  let state: { user: unknown; loading: boolean } = { user: null, loading: true };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: { user: unknown; loading: boolean }) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
});

const apiFetch = vi.hoisted(() =>
  vi.fn(async (path: string, options?: { body?: Record<string, unknown> }) => {
    if (path === '/organizations/mine') return [];
    if (path === '/organizations') {
      return {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        industry: 'CONCERTS',
        stellarAccount: options?.body?.stellarAccount,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
    }
    return null;
  }),
);

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  apiFetch,
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => {
    const state = authStore.get() as AuthState;
    return {
      user: state.user,
      loading: state.loading,
      login: async () => {},
      register: async () => {},
      logout: () => {},
      refresh: async () => {},
    };
  },
}));

import DashboardPage from './page';

const WALLET_A = `G${'A'.repeat(55)}`;
const WALLET_B = `G${'B'.repeat(55)}`;
const WALLET_C = `G${'C'.repeat(55)}`;

function makeUser(stellarPublicKey: string | null): Me {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada',
    role: 'ORGANIZER',
    stellarPublicKey,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Subscribes to the auth store so store updates re-render the dashboard. */
function Harness() {
  const [, setVersion] = useState(0);
  useEffect(() => authStore.subscribe(() => setVersion((version) => version + 1)), []);
  return createElement(DashboardPage);
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  authStore.set({ user: null, loading: true });
  apiFetch.mockClear();
  push.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

async function render() {
  await act(async () => {
    root.render(createElement(Harness));
  });
}

async function setAuth(state: AuthState) {
  await act(async () => {
    authStore.set(state);
  });
}

function stellarInput(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[pattern="G[A-Z0-9]{55}"]');
  if (!input) throw new Error('Stellar account input was not rendered');
  return input;
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    // Write through the native setter so React sees the change as user input.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  const form = container.querySelector('form');
  if (!form) throw new Error('Create-organization form was not rendered');
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('DashboardPage Stellar account field', () => {
  it('initializes the field from the connected wallet', async () => {
    authStore.set({ user: makeUser(WALLET_A), loading: false });
    await render();

    expect(stellarInput().value).toBe(WALLET_A);
  });

  it('fills an untouched field when the wallet becomes available', async () => {
    await render();
    expect(container.querySelector('form')).toBeNull();

    await setAuth({ user: makeUser(WALLET_A), loading: false });

    expect(stellarInput().value).toBe(WALLET_A);
  });

  it('updates an untouched field when the wallet changes, without remounting the input', async () => {
    authStore.set({ user: makeUser(WALLET_A), loading: false });
    await render();
    const input = stellarInput();

    await setAuth({ user: makeUser(WALLET_B), loading: false });

    expect(stellarInput().value).toBe(WALLET_B);
    // A key-based remount would create a new DOM node.
    expect(stellarInput()).toBe(input);
  });

  it('keeps a user-entered value when the wallet changes afterwards', async () => {
    authStore.set({ user: makeUser(WALLET_A), loading: false });
    await render();

    await type(stellarInput(), WALLET_C);
    expect(stellarInput().value).toBe(WALLET_C);

    await setAuth({ user: makeUser(WALLET_B), loading: false });

    expect(stellarInput().value).toBe(WALLET_C);
  });

  it('submits the current field value when creating an organization', async () => {
    authStore.set({ user: makeUser(WALLET_A), loading: false });
    await render();

    await type(stellarInput(), WALLET_C);
    await submit();

    expect(apiFetch).toHaveBeenCalledWith(
      '/organizations',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ stellarAccount: WALLET_C }),
      }),
    );
  });

  it('submits the wallet-derived value when the field is untouched', async () => {
    authStore.set({ user: makeUser(WALLET_A), loading: false });
    await render();

    await submit();

    expect(apiFetch).toHaveBeenCalledWith(
      '/organizations',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ stellarAccount: WALLET_A }),
      }),
    );
  });
});
