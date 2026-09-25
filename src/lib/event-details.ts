/** Formatting helpers for the organizer event-details block (#104). */

export function buildPublishSummary(event: {
  name?: string;
  startsAt?: string;
  endsAt?: string | null;
  venue?: string;
  maxResaleMultiplierBps?: number;
  ticketTypes?: Array<{ name: string; quantityTotal?: number; price?: string }>;
}): string {
  const dateSummary = [
    event.startsAt ? formatEventDate(event.startsAt) : 'Not set',
    event.endsAt ? `– ${formatEventDate(event.endsAt)}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
        .map((tt) => `${tt.name} (${tt.quantityTotal ?? 0} total${tt.price ? ` · ${tt.price}` : ''})`)
        .join(', ')
    : 'No ticket types added yet';

  return [
    `Event: ${event.name ?? 'Untitled event'}`,
    `Date: ${dateSummary}`,
    `Venue: ${event.venue ?? 'Not set'}`,
    `Ticket types: ${ticketTypes}`,
    `Resale cap: ${formatResaleCap(event.maxResaleMultiplierBps ?? 10_000)}`,
  ].join('\n');
}

/** 500 → "5%", 250 → "2.5%". */
export function formatRoyalty(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}

/** 15000 → "1.5× face value", 10000 → "1× face value (no markup)". */
export function formatResaleCap(bps: number): string {
  const multiplier = Number((bps / 10_000).toFixed(2));
  return bps === 10_000
    ? `${multiplier}× face value (no markup)`
    : `${multiplier}× face value`;
}

/** Resale cap for a ticket: price × bps / 10000 (whole units), or null when the price isn't an integer. */
export function maxResalePrice(price: string | undefined, bps: number | undefined): string | null {
  if (!price || bps === undefined || !/^\d+$/.test(price)) return null;
  return ((BigInt(price) * BigInt(bps)) / BigInt(10_000)).toString();
}

/** Locale date + time, e.g. "Sat, 20 Jun 2026, 19:00". */
export function formatEventDate(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

const EXPLORER_NETWORK: Record<string, string> = {
  testnet: 'testnet',
  mainnet: 'public',
  public: 'public',
};

/**
 * stellar.expert link to the ticketing contract the event lives in, or null
 * when the contract id isn't configured or the network has no explorer.
 */
export function ticketingContractUrl(
  contractId: string | undefined,
  network: string | undefined,
): string | null {
  const explorerNetwork = EXPLORER_NETWORK[(network ?? 'testnet').toLowerCase()];
  if (!contractId || !explorerNetwork) return null;
  return `https://stellar.expert/explorer/${explorerNetwork}/contract/${encodeURIComponent(contractId)}`;
}
