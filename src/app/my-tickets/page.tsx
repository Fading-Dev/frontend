'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { signAndSubmit } from '@/lib/onchain';
import { INDUSTRY_LABELS, type Ticket } from '@/lib/types';
import { formatEventDate, maxResalePrice } from '@/lib/event-details';
import { FormError } from '@/components/form-error';
import { CopyButton } from '@/components/copy-button';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';

type ActiveAction = { ticketId: string; type: 'transfer' | 'resell' } | null;
type TransferRecipient = { id: string; name?: string; email?: string };

export default function MyTicketsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [resalePrice, setResalePrice] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState<{
    ticketId: string;
    recipient: TransferRecipient;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  async function loadTickets() {
    const res = await apiFetch<Ticket[]>('/tickets/mine');
    setTickets(res);
  }

  useEffect(() => {
    if (!user) return;
    async function run() {
      await loadTickets();
      setLoadingTickets(false);
    }
    void run();
  }, [user]);

  function requireWallet(): string | null {
    if (!user?.stellarPublicKey) {
      setError('Connect your wallet before managing tickets.');
      return null;
    }
    return user.stellarPublicKey;
  }

  async function handleLookupRecipient(ticket: Ticket) {
    if (transferEmail.trim().toLowerCase() === user?.email.toLowerCase()) {
      setError('You already own this ticket.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusyTicketId(ticket.id);
    try {
      const recipient = await apiFetch<TransferRecipient>(
        `/users/lookup?email=${encodeURIComponent(transferEmail)}`,
      );
      setPendingTransfer({ ticketId: ticket.id, recipient });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not find that user.');
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleTransfer(ticketId: string, recipient: TransferRecipient) {
    const wallet = requireWallet();
    if (!wallet) return;
    setError(null);
    setNotice(null);
    setBusyTicketId(ticketId);
    try {
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
      setPendingTransfer(null);
      setTransferEmail('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not transfer this ticket.');
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleListForResale(ticket: Ticket) {
    const ticketId = ticket.id;
    const wallet = requireWallet();
    if (!wallet) return;
    const cap = maxResalePrice(ticket.ticketType?.price, ticket.event?.maxResaleMultiplierBps);
    if (cap !== null && (!/^\d+$/.test(resalePrice) || BigInt(resalePrice) > BigInt(cap))) {
      setError(`Enter a whole-number price of at most ${cap}.`);
      return;
    }
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
                  {ticket.event && (
                    <p className="text-sm text-muted">
                      {formatEventDate(ticket.event.startsAt)} · {ticket.event.venue} ·{' '}
                      {INDUSTRY_LABELS[ticket.event.category]}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {ticket.status}
                </span>
              </div>

              <p className="mt-3 flex items-center gap-1 text-xs text-muted">
                Gate code:{' '}
                <span className="font-mono text-foreground select-all">{ticket.qrSecret}</span>
                <CopyButton value={ticket.qrSecret} label="Copy gate code" />
              </p>

              {ticket.status === 'VALID' && (
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() =>
                      setActiveAction((prev) =>
                        prev?.ticketId === ticket.id && prev.type === 'transfer'
                          ? null
                          : { ticketId: ticket.id, type: 'transfer' },
                      )
                    }
                    className="text-sm text-gradient font-medium hover:underline"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() =>
                      setActiveAction((prev) =>
                        prev?.ticketId === ticket.id && prev.type === 'resell'
                          ? null
                          : { ticketId: ticket.id, type: 'resell' },
                      )
                    }
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
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={transferEmail}
                    onChange={(e) => {
                      setTransferEmail(e.target.value);
                      setPendingTransfer(null);
                    }}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button
                    onClick={() => handleLookupRecipient(ticket)}
                    loading={busyTicketId === ticket.id && pendingTransfer === null}
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
              )}
              {pendingTransfer?.ticketId === ticket.id && (
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <p>
                    Transfer <span className="font-medium">{ticket.event?.name}</span> to{' '}
                    {pendingTransfer.recipient.name
                      ? `${pendingTransfer.recipient.name} (${transferEmail})`
                      : transferEmail}
                    ?
                  </p>
                  <Button
                    onClick={() => handleTransfer(ticket.id, pendingTransfer.recipient)}
                    loading={busyTicketId === ticket.id}
                    size="sm"
                  >
                    {busyTicketId === ticket.id ? 'Sending…' : 'Confirm'}
                  </Button>
                </div>
              )}
              {activeAction?.ticketId === ticket.id && activeAction.type === 'resell' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    inputMode="numeric"
                    placeholder="Asking price"
                    value={resalePrice}
                    onChange={(e) => setResalePrice(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button
                    onClick={() => handleListForResale(ticket)}
                    loading={busyTicketId === ticket.id}
                    size="sm"
                  >
                    {busyTicketId === ticket.id ? 'Listing…' : 'List'}
                  </Button>
                  {maxResalePrice(ticket.ticketType?.price, ticket.event?.maxResaleMultiplierBps) !==
                    null && (
                    <p className="w-full text-xs text-muted">
                      Max resale price:{' '}
                      {maxResalePrice(ticket.ticketType?.price, ticket.event?.maxResaleMultiplierBps)}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
