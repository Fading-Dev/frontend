'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { signAndSubmit } from '@/lib/onchain';
import { FormError } from '@/components/form-error';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';
import { QrScanner } from '@/components/qr-scanner';
import { STATUS_LABELS, STATUS_STYLES } from '@/components/status-badge';

interface VerifyResult {
  ticketId: string;
  eventName: string;
  tier: string;
  seat: string;
  ownerName: string;
  status: 'VALID' | 'USED' | 'REVOKED' | 'RESALE';
  onChainOwner: string;
}

export default function VerifyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  async function lookup(ticketCode: string) {
    setError(null);
    setResult(null);
    setChecking(true);
    try {
      const res = await apiFetch<VerifyResult>(`/tickets/verify/${encodeURIComponent(ticketCode)}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify this ticket.');
    } finally {
      setChecking(false);
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    void lookup(code);
  }

  function handleScanned(scanned: string) {
    setScanning(false);
    setCode(scanned);
    void lookup(scanned);
  }

  async function handleCheckIn() {
    if (!result || !user?.stellarPublicKey) return;
    setError(null);
    setActionBusy(true);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${result.ticketId}/check-in`,
        { method: 'POST' },
      );
      await signAndSubmit(unsignedXdr, user.stellarPublicKey, (signedXdr) =>
        apiFetch(`/tickets/${result.ticketId}/confirm-check-in`, {
          method: 'POST',
          body: { signedXdr },
        }),
      );
      setResult({ ...result, status: 'USED' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check in this ticket.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRevoke() {
    if (!result || !user?.stellarPublicKey) return;
    setError(null);
    setActionBusy(true);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${result.ticketId}/revoke`,
        { method: 'POST' },
      );
      await signAndSubmit(unsignedXdr, user.stellarPublicKey, (signedXdr) =>
        apiFetch(`/tickets/${result.ticketId}/confirm-revoke`, {
          method: 'POST',
          body: { signedXdr },
        }),
      );
      setResult({ ...result, status: 'REVOKED' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this ticket.');
    } finally {
      setActionBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-heading text-3xl font-bold">Verify a ticket</h1>
      <p className="mt-2 text-muted">
        Enter the code from a ticket’s QR to check its on-chain owner and status before admitting
        entry. You must be staff on the event’s organization to verify or check in its tickets.
      </p>
      <div className="mt-4">
        <WalletConnectButton />
      </div>

      <form onSubmit={handleLookup} className="mt-6 flex gap-3">
        <input
          required
          placeholder="Ticket code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
        <Button
          type="submit"
          loading={checking}
        >
          {checking ? 'Checking…' : 'Verify'}
        </Button>
      </form>

      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setScanning((on) => !on)}
        >
          {scanning ? 'Stop scanning' : 'Scan with camera'}
        </Button>
      </div>
      {scanning && (
        <div className="mt-3">
          <QrScanner onDetected={handleScanned} />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}

      {result && (
        <div className={`mt-6 rounded-lg border p-6 ${STATUS_STYLES[result.status]}`}>
          <p className="text-lg font-semibold">{STATUS_LABELS[result.status]}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-foreground">
            <dt className="text-muted">Event</dt>
            <dd>{result.eventName}</dd>
            <dt className="text-muted">Tier / seat</dt>
            <dd>
              {result.tier} · {result.seat}
            </dd>
            <dt className="text-muted">Owner</dt>
            <dd>{result.ownerName}</dd>
            <dt className="text-muted">On-chain owner</dt>
            <dd className="truncate font-mono text-xs">{result.onChainOwner}</dd>
          </dl>
          <div className="mt-4 flex gap-3">
            {result.status === 'VALID' && (
              <Button
                onClick={handleCheckIn}
                loading={actionBusy}
                className="text-sm"
              >
                {actionBusy ? 'Working…' : 'Check in'}
              </Button>
            )}
            {result.status !== 'REVOKED' && (
              <Button
                onClick={handleRevoke}
                loading={actionBusy}
                variant="danger"
                className="text-sm"
              >
                {actionBusy ? 'Working…' : 'Revoke'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
