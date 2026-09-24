import { ExternalLink } from 'lucide-react';
import { INDUSTRY_LABELS, type EventRecord } from '@/lib/types';
import {
  formatEventDate,
  formatResaleCap,
  formatRoyalty,
  ticketingContractUrl,
} from '@/lib/event-details';

const CONTRACT_URL = ticketingContractUrl(
  process.env.NEXT_PUBLIC_TICKETING_CONTRACT_ID,
  process.env.NEXT_PUBLIC_STELLAR_NETWORK,
);

/** Read-only summary of what an organizer is about to publish (#104). */
export function EventDetails({ event }: { event: EventRecord }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Starts', value: formatEventDate(event.startsAt) },
    { label: 'Ends', value: event.endsAt ? formatEventDate(event.endsAt) : 'Not set' },
    { label: 'Category', value: INDUSTRY_LABELS[event.category] ?? event.category },
    { label: 'Venue', value: event.venue },
    { label: 'Resale cap', value: formatResaleCap(event.maxResaleMultiplierBps) },
    { label: 'Organizer royalty', value: formatRoyalty(event.royaltyBps) },
    {
      label: 'On-chain event',
      value: event.chainEventId ? (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">#{event.chainEventId}</span>
          {CONTRACT_URL && (
            <a
              href={CONTRACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gradient font-medium hover:underline"
            >
              View contract
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </span>
      ) : (
        'Not published yet'
      ),
    },
  ];

  return (
    <section aria-labelledby="event-details-heading" className="mt-6 rounded-lg border border-border p-4">
      <h2 id="event-details-heading" className="sr-only">
        Event details
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted">{row.label}</dt>
            <dd className="mt-0.5 text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
