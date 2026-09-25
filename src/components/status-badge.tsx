import type { EventStatus, TicketStatus } from '@/lib/types';

type Status = TicketStatus | EventStatus;

export const STATUS_STYLES: Record<Status, string> = {
  VALID: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
  USED: 'text-amber-400 border-amber-900/50 bg-amber-950/30',
  REVOKED: 'text-red-400 border-red-900/50 bg-red-950/30',
  RESALE: 'text-sky-400 border-sky-900/50 bg-sky-950/30',
  DRAFT: 'text-amber-400 border-amber-900/50 bg-amber-950/30',
  PUBLISHED: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
  CANCELLED: 'text-red-400 border-red-900/50 bg-red-950/30',
};

export const STATUS_LABELS: Record<Status, string> = {
  VALID: 'Valid',
  USED: 'Used',
  REVOKED: 'Revoked',
  RESALE: 'Listed for resale',
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
