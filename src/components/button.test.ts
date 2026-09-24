import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, buttonClassName } from './button';

function render(props: Parameters<typeof Button>[0]): HTMLButtonElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(Button, props));
  return host.querySelector('button')!;
}

describe('buttonClassName', () => {
  it('defaults to the primary md style', () => {
    const cls = buttonClassName();
    expect(cls).toContain('bg-gradient-sunset');
    expect(cls).toContain('rounded-md px-4 py-2');
  });

  it('maps variants and sizes', () => {
    expect(buttonClassName({ variant: 'secondary' })).toContain('border-border');
    expect(buttonClassName({ variant: 'danger' })).toContain('text-red-300');
    expect(buttonClassName({ size: 'sm' })).toContain('px-3 py-2 text-sm');
    expect(buttonClassName({ size: 'lg' })).toContain('rounded-xl px-4 py-3');
  });

  it('appends caller classes', () => {
    expect(buttonClassName({ className: 'mt-2' }).endsWith(' mt-2')).toBe(true);
  });
});

describe('Button', () => {
  it('defaults to type="button" and is not busy', () => {
    const btn = render({ children: 'Go' });
    expect(btn.type).toBe('button');
    expect(btn.disabled).toBe(false);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
  });

  it('loading disables the button and sets aria-busy', () => {
    const btn = render({ loading: true, children: 'Saving…' });
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('respects an explicit disabled without marking busy', () => {
    const btn = render({ disabled: true, children: 'Go' });
    expect(btn.disabled).toBe(true);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
  });

  it('passes through type="submit"', () => {
    expect(render({ type: 'submit', children: 'Send' }).type).toBe('submit');
  });
});
