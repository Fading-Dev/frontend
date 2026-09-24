import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalError from './global-error';
import { BRAND_GRADIENT } from '@/components/logo';

function render(error: Error & { digest?: string }): Document {
  const markup = renderToStaticMarkup(
    createElement(GlobalError, { error, unstable_retry: () => {} }),
  );
  return new DOMParser().parseFromString(markup, 'text/html');
}

describe('GlobalError', () => {
  it('renders its own document with a lang attribute', () => {
    const doc = render(new Error('boom'));
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.body.getAttribute('style')).toContain('background:#000000');
  });

  it('shows an alert with retry and reload actions', () => {
    const doc = render(new Error('boom'));
    expect(doc.querySelector('[role="alert"] h1')?.textContent).toBe('Something went wrong');
    const labels = [...doc.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['Try again', 'Reload page']);
  });

  it('styles the primary action with the brand gradient', () => {
    const doc = render(new Error('boom'));
    const retry = doc.querySelector('button');
    expect(retry?.getAttribute('style')).toContain(BRAND_GRADIENT);
  });

  it('shows the error digest when present, and never the raw message', () => {
    const withDigest = render(Object.assign(new Error('secret internals'), { digest: 'abc123' }));
    expect(withDigest.body.textContent).toContain('abc123');
    expect(withDigest.body.textContent).not.toContain('secret internals');

    const withoutDigest = render(new Error('boom'));
    expect(withoutDigest.body.textContent).not.toContain('Error reference');
  });
});
