'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { signAndSubmit } from '@/lib/onchain';
import type { EventRecord, TicketType } from '@/lib/types';
import { FormError } from '@/components/form-error';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { EventDetails } from '@/components/event-details';
import { buildPublishSummary } from '@/lib/event-details';

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [ttName, setTtName] = useState('');
  const [ttPrice, setTtPrice] = useState('');
  const [ttQuantity, setTtQuantity] = useState('');
  const [savingTicketType, setSavingTicketType] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [showPublishReview, setShowPublishReview] = useState(false);

  const [issueEmail, setIssueEmail] = useState('');
  const [issueTicketTypeId, setIssueTicketTypeId] = useState('');
  const [issueSeat, setIssueSeat] = useState('');
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  async function loadEvent() {
    const res = await apiFetch<EventRecord>(`/events/${id}`);
    setEvent(res);
    if (res.ticketTypes && res.ticketTypes.length > 0 && !issueTicketTypeId) {
      setIssueTicketTypeId(res.ticketTypes[0].id);
    }
  }

  useEffect(() => {
    if (!user) return;
    async function run() {
      await loadEvent();
      setLoadingEvent(false);
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function handleAddTicketType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingTicketType(true);
    try {
      const tt = await apiFetch<TicketType>(`/events/${id}/ticket-types`, {
        method: 'POST',
        body: { name: ttName, price: ttPrice, quantityTotal: Number(ttQuantity) },
      });
      setEvent((prev) => (prev ? { ...prev, ticketTypes: [...(prev.ticketTypes ?? []), tt] } : prev));
      setTtName('');
      setTtPrice('');
      setTtQuantity('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the ticket type.');
    } finally {
      setSavingTicketType(false);
    }
  }

  async function handlePublish() {
    if (!user?.stellarPublicKey) {
      setError('Connect your organization’s Stellar wallet before publishing.');
      return;
    }
    setError(null);
    setNotice(null);
    setShowPublishReview(true);
  }

  async function confirmPublish() {
    if (!user?.stellarPublicKey || !event) {
      setError('Connect your organization’s Stellar wallet before publishing.');
      return;
    }
    setError(null);
    setShowPublishReview(false);
    setPublishing(true);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(`/events/${id}/publish`, {
        method: 'POST',
      });
      await signAndSubmit(unsignedXdr, user.stellarPublicKey, (signedXdr) =>
        apiFetch(`/events/${id}/confirm-publish`, { method: 'POST', body: { signedXdr } }),
      );
      setNotice('Event published on-chain.');
      await loadEvent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish this event.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.stellarPublicKey) {
      setError('Connect your organization’s Stellar wallet before issuing tickets.');
      return;
    }
    setError(null);
    setNotice(null);
    setIssuing(true);
    try {
      const recipient = await apiFetch<{ id: string }>(
        `/users/lookup?email=${encodeURIComponent(issueEmail)}`,
      );
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>('/tickets/issue', {
        method: 'POST',
        body: { ticketTypeId: issueTicketTypeId, toUserId: recipient.id, seat: issueSeat || undefined },
      });
      await signAndSubmit(unsignedXdr, user.stellarPublicKey, (signedXdr) =>
        apiFetch('/tickets/confirm-issue', {
          method: 'POST',
          body: {
            ticketTypeId: issueTicketTypeId,
            toUserId: recipient.id,
            seat: issueSeat || undefined,
            signedXdr,
          },
        }),
      );
      setNotice(`Ticket issued to ${issueEmail}.`);
      setIssueEmail('');
      setIssueSeat('');
      await loadEvent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not issue this ticket.');
    } finally {
      setIssuing(false);
    }
  }

  if (loading || !user || loadingEvent || !event) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          {
            label: event.organization?.name ?? 'Organization',
            href: `/dashboard/organizations/${event.organizationId}`,
          },
          { label: event.name },
        ]}
      />
      <p className="text-sm text-muted">{event.venue}</p>
      <div className="mt-1 flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold">{event.name}</h1>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
          {event.status}
        </span>
      </div>

      <EventDetails event={event} />

      <div className="mt-4">
        <WalletConnectButton />
      </div>

      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}
      {notice && <p className="mt-6 text-sm text-gradient font-medium">{notice}</p>}

      {event.status === 'DRAFT' && (
        <>
          {!showPublishReview ? (
            <Button onClick={handlePublish} loading={publishing} className="mt-6">
              {publishing ? 'Publishing…' : 'Publish event on-chain'}
            </Button>
          ) : (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <h2 className="font-heading text-lg font-bold">Confirm event publication</h2>
              <p className="mt-2 text-sm text-muted">
                Publishing locks the event parameters on-chain and opens ticket sales. Review the
                details below before the wallet prompt appears.
              </p>
              <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm text-foreground">
                {buildPublishSummary(event)}
              </pre>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={confirmPublish} loading={publishing}>
                  {publishing ? 'Publishing…' : 'Confirm and publish'}
                </Button>
                <Button variant="secondary" onClick={() => setShowPublishReview(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <h2 className="mt-10 font-heading text-xl font-bold">Ticket types</h2>
      {!event.ticketTypes || event.ticketTypes.length === 0 ? (
        <p className="mt-4 text-muted">No ticket types yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {event.ticketTypes.map((tt) => (
            <li
              key={tt.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <span>{tt.name}</span>
              <span className="text-sm text-muted">
                {tt.price} · {tt.quantityIssued}/{tt.quantityTotal} issued
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddTicketType} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            required
            placeholder="GA"
            value={ttName}
            onChange={(e) => setTtName(e.target.value)}
            className="w-28 rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Price
          <input
            required
            inputMode="numeric"
            placeholder="1000"
            value={ttPrice}
            onChange={(e) => setTtPrice(e.target.value)}
            className="w-28 rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Quantity
          <input
            required
            inputMode="numeric"
            placeholder="100"
            value={ttQuantity}
            onChange={(e) => setTtQuantity(e.target.value)}
            className="w-28 rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <Button
          type="submit"
          loading={savingTicketType}
          variant="secondary"
        >
          {savingTicketType ? 'Adding…' : 'Add ticket type'}
        </Button>
      </form>

      {event.ticketTypes && event.ticketTypes.length > 0 && (
        <>
          <h2 className="mt-10 font-heading text-xl font-bold">Issue a ticket</h2>
          <form onSubmit={handleIssue} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Recipient email
              <input
                type="email"
                required
                value={issueEmail}
                onChange={(e) => setIssueEmail(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2"
              />
              <span className="text-xs text-muted">
                The recipient must already have a StellarTickets account with a connected wallet.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ticket type
              <select
                value={issueTicketTypeId}
                onChange={(e) => setIssueTicketTypeId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2"
              >
                {event.ticketTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Seat (optional)
              <input
                value={issueSeat}
                onChange={(e) => setIssueSeat(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2"
              />
            </label>
            <Button
              type="submit"
              loading={issuing}
              className="self-start"
            >
              {issuing ? 'Issuing…' : 'Issue ticket'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
