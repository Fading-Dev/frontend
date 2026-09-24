'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { connectWallet, WalletError } from '@/lib/wallet';
import { CopyButton } from './copy-button';

export function WalletConnectButton() {
  const { user, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  if (!user) return null;

  if (user.stellarPublicKey) {
    return (
      <p className="flex items-center gap-1 text-sm text-muted">
        Wallet connected:{' '}
        <span className="font-mono text-foreground" title={user.stellarPublicKey}>
          {user.stellarPublicKey.slice(0, 6)}…{user.stellarPublicKey.slice(-6)}
        </span>
        <CopyButton value={user.stellarPublicKey} label="Copy wallet address" />
      </p>
    );
  }

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const address = await connectWallet();
      await apiFetch('/users/me/wallet', { method: 'PATCH', body: { stellarPublicKey: address } });
      await refresh();
    } catch (err) {
      if (err instanceof WalletError) setError(err.message);
      else if (err instanceof ApiError) setError(err.message);
      else setError('Could not connect your wallet. Is Freighter installed?');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
      >
        {connecting ? 'Connecting…' : 'Connect Freighter wallet'}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
