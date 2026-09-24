'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { BRAND_GRADIENT, LogoMark } from '@/components/logo';

/**
 * Last-resort boundary for errors thrown by the root layout or its providers,
 * which `error.tsx` can't catch. It replaces the whole document, so it renders
 * its own <html>/<body> and can't rely on globals.css — brand colours are
 * inlined here (mirroring the :root tokens) instead of Tailwind classes.
 */
const COLORS = {
  background: '#000000',
  surface: '#150f22',
  foreground: '#f7f5fb',
  muted: '#a79fbe',
  border: '#2a2340',
} as const;

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
          background: COLORS.background,
          color: COLORS.foreground,
          fontFamily: FONT_STACK,
        }}
      >
        <title>Something went wrong · StellarTickets</title>
        <main
          role="alert"
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '32px',
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            background: COLORS.surface,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LogoMark size={40} />
          </div>
          <h1 style={{ margin: '20px 0 8px', fontSize: '22px', fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: COLORS.muted }}>
            StellarTickets hit an unexpected error while loading. Your tickets and wallet are
            safe — try again, or reload the page.
          </p>
          {error.digest && (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: COLORS.muted }}>
              Error reference: <code>{error.digest}</code>
            </p>
          )}
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '8px',
                backgroundImage: BRAND_GRADIENT,
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                background: 'transparent',
                color: COLORS.foreground,
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
