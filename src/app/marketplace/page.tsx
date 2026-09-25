'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { signAndSubmit } from '@/lib/onchain';
import type { ResaleListing } from '@/lib/types';
import { FormError } from '@/components/form-error';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';

export default function MarketplacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [buyingTicketId, setBuyingTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch<ResaleListing[]>('/tickets/resale')
      .then(setListings)
      .finally(() => setLoadingListings(false));
  }, [user]);

  async function handleBuy(ticketId: string) {
    if (!user?.stellarPublicKey) {
      setError('Connect your wallet before buying a resale ticket.');
      return;
    }
    setError(null);
    setNotice(null);
    setBuyingTicketId(ticketId);
    try {
      const { unsignedXdr } = await apiFetch<{ unsignedXdr: string }>(
        `/tickets/${ticketId}/buy-resale`,
        { method: 'POST' },
      );
      await signAndSubmit(unsignedXdr, user.stellarPublicKey, (signedXdr) =>
        apiFetch(`/tickets/${ticketId}/confirm-buy-resale`, {
          method: 'POST',
          body: { signedXdr },
        }),
      );
      setNotice('Ticket purchased — find it under My tickets.');
      setListings((prev) => prev.filter((l) => l.ticketId !== ticketId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete the purchase.');
    } finally {
      setBuyingTicketId(null);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold">Resale marketplace</h1>
      <p className="mt-2 text-muted">
        Every listing below is a real ticket resold under its event’s anti-scalping price cap and
        organizer royalty, settled on-chain.
      </p>
      <div className="mt-4">
        <WalletConnectButton />
      </div>

      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}
      {notice && <p className="mt-6 text-sm text-gradient font-medium">{notice}</p>}

      {loadingListings ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="mt-8 text-muted">No tickets are listed for resale right now.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{listing.ticket.event.name}</p>
                <p className="break-words text-sm text-muted">
                  {listing.ticket.ticketType.name} · {listing.ticket.event.venue} · sold by{' '}
                  {listing.seller.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-mono">{listing.price}</span>
                <Button
                  onClick={() => handleBuy(listing.ticketId)}
                  loading={buyingTicketId === listing.ticketId}
                  className="text-sm"
                >
                  {buyingTicketId === listing.ticketId ? 'Buying…' : 'Buy'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
