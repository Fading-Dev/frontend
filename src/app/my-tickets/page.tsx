'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { signAndSubmit } from '@/lib/onchain';
import type { Ticket } from '@/lib/types';
import { FormError } from '@/components/form-error';
import { CopyButton } from '@/components/copy-button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { TicketQr } from '@/components/ticket-qr';

type ActiveAction = { ticketId: string; type: 'transfer' | 'resell' } | null;

export default function MyTicketsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [resalePrice, setResalePrice] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  async function loadTickets() {
    try {
      const res = await apiFetch<Ticket[]>('/tickets/mine');
      setTickets(res);
      setLoadFailed(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your tickets.');
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    if (!user) return;
    async function run() {
      await loadTickets();
      setLoadingTickets(false);
    }
    void run();
  }, [user]);

  async function retryLoad() {
    setError(null);
    setLoadingTickets(true);
    await loadTickets();
    setLoadingTickets(false);
  }

  function toggleAction(ticketId: string, type: 'transfer' | 'resell') {
    setActiveAction((prev) =>
      prev?.ticketId === ticketId && prev.type === type ? null : { ticketId, type },
    );
    setTransferEmail('');
    setResalePrice('');
  }

  function requireWallet(): string | null {
    if (!user?.stellarPublicKey) {
      setError('Connect your wallet before managing tickets.');
      return null;
    }
    return user.stellarPublicKey;
  }

  async function handleTransfer(e: FormEvent, ticketId: string) {
    e.preventDefault();
    const wallet = requireWallet();
    if (!wallet) return;
    setError(null);
    setNotice(null);
    setBusyTicketId(ticketId);
    try {
      const recipient = await apiFetch<{ id: string }>(
        `/users/lookup?email=${encodeURIComponent(transferEmail)}`,
      );
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${ticketId}/transfer`,
        { method: 'POST', body: { toUserId: recipient.id } },
      );
      await signAndSubmit(unsignedXdr, wallet, (signedXdr) =>
        apiFetch(`/tickets/${ticketId}/confirm-transfer`, {
          method: 'POST',
          body: { toUserId: recipient.id, signedXdr },
        }),
      );
      setNotice(`Ticket transferred to ${transferEmail}.`);
      setActiveAction(null);
      setTransferEmail('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not transfer this ticket.');
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleListForResale(ticketId: string) {
    if (!/^[1-9]\d*$/.test(resalePrice)) return;
  async function handleListForResale(e: FormEvent, ticketId: string) {
    e.preventDefault();
    const wallet = requireWallet();
    if (!wallet) return;
    setError(null);
    setNotice(null);
    setBusyTicketId(ticketId);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${ticketId}/list-resale`,
        { method: 'POST', body: { price: resalePrice } },
      );
      await signAndSubmit(unsignedXdr, wallet, (signedXdr) =>
        apiFetch(`/tickets/${ticketId}/confirm-list-resale`, {
          method: 'POST',
          body: { price: resalePrice, signedXdr },
        }),
      );
      setNotice('Ticket listed on the marketplace.');
      setActiveAction(null);
      setResalePrice('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not list this ticket.');
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleCancelResale(ticketId: string) {
    const wallet = requireWallet();
    if (!wallet) return;
    setError(null);
    setNotice(null);
    setBusyTicketId(ticketId);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${ticketId}/cancel-resale`,
        { method: 'POST' },
      );
      await signAndSubmit(unsignedXdr, wallet, (signedXdr) =>
        apiFetch(`/tickets/${ticketId}/confirm-cancel-resale`, {
          method: 'POST',
          body: { signedXdr },
        }),
      );
      setNotice('Listing cancelled.');
      await loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this listing.');
    } finally {
      setBusyTicketId(null);
    }
  }

  if (loading || !user) return null;

  const isValidResalePrice = /^[1-9]\d*$/.test(resalePrice);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold">My tickets</h1>
      <div className="mt-4">
        <WalletConnectButton />
      </div>

      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}
      {notice && <p className="mt-6 text-sm text-gradient font-medium">{notice}</p>}

      {loadingTickets ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : loadFailed && tickets.length === 0 ? (
        <div className="mt-8">
          <Button onClick={retryLoad} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      ) : tickets.length === 0 ? (
        <p className="mt-8 text-muted">You don’t have any tickets yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{ticket.event?.name}</p>
                  <p className="text-sm text-muted">
                    {ticket.ticketType?.name} · Seat {ticket.seat}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              {ticket.status === 'VALID' ? (
                <div className="mt-3">
                  <TicketQr value={ticket.qrSecret} />
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                    Gate code:{' '}
                    <span className="font-mono text-foreground select-all">{ticket.qrSecret}</span>
                    <CopyButton value={ticket.qrSecret} label="Copy gate code" />
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  {ticket.status === 'RESALE'
                    ? 'The gate code is hidden while this ticket is listed for resale.'
                    : 'The gate code is no longer valid for this ticket.'}
                </p>
              )}

              {ticket.status === 'VALID' && (
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => toggleAction(ticket.id, 'transfer')}
                    className="text-sm text-gradient font-medium hover:underline"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => toggleAction(ticket.id, 'resell')}
                    className="text-sm text-gradient font-medium hover:underline"
                  >
                    List for resale
                  </button>
                </div>
              )}
              {ticket.status === 'RESALE' && (
                <button
                  onClick={() => handleCancelResale(ticket.id)}
                  disabled={busyTicketId === ticket.id}
                  className="mt-3 text-sm text-gradient font-medium hover:underline disabled:opacity-50"
                >
                  {busyTicketId === ticket.id ? 'Working…' : 'Cancel listing'}
                </button>
              )}

              {activeAction?.ticketId === ticket.id && activeAction.type === 'transfer' && (
                <form
                  onSubmit={(e) => handleTransfer(e, ticket.id)}
                  className="mt-3 flex gap-2"
                >
                  <label htmlFor={`transfer-email-${ticket.id}`} className="sr-only">
                    Recipient email
                  </label>
                  <input
                    id={`transfer-email-${ticket.id}`}
                    type="email"
                    required
                    placeholder="recipient@example.com"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button type="submit" loading={busyTicketId === ticket.id} size="sm">
                    {busyTicketId === ticket.id ? 'Sending…' : 'Send'}
                  </Button>
                </form>
              )}
              {activeAction?.ticketId === ticket.id && activeAction.type === 'resell' && (
                <form
                  onSubmit={(e) => handleListForResale(e, ticket.id)}
                  className="mt-3 flex gap-2"
                >
                  <label htmlFor={`resale-price-${ticket.id}`} className="sr-only">
                    Asking price
                  </label>
                  <input
                    id={`resale-price-${ticket.id}`}
                    inputMode="numeric"
                    required
                    placeholder="Asking price"
                    value={resalePrice}
                    onChange={(e) => setResalePrice(e.target.value)}
                    aria-invalid={resalePrice !== '' && !isValidResalePrice}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button
                    onClick={() => handleListForResale(ticket.id)}
                    loading={busyTicketId === ticket.id}
                    disabled={!isValidResalePrice}
                    size="sm"
                  >
                  <Button type="submit" loading={busyTicketId === ticket.id} size="sm">
                    {busyTicketId === ticket.id ? 'Listing…' : 'List'}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
