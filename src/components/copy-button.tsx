'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

type Status = 'idle' | 'copied' | 'error';

export function CopyButton({
  value,
  label = 'Copy',
  className = '',
}: {
  value: string;
  /** Accessible name, e.g. "Copy wallet address". */
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(value);
    setStatus(ok ? 'copied' : 'error');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label}
        title={label}
        className={`inline-flex items-center rounded p-1 text-muted hover:bg-surface hover:text-foreground ${className}`}
      >
        {status === 'copied' ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
      <span aria-live="polite" role="status" className="text-xs text-muted">
        {status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : ''}
      </span>
    </span>
  );
}
