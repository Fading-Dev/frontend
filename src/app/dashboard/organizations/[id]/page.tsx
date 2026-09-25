"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  type EventRecord,
  type Organization,
} from "@/lib/types";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { Breadcrumbs } from "@/components/breadcrumbs";

// Resale cap is a multiplier of face value (100% = no markup allowed); royalty is a
// straightforward percentage of the resale price. Bounds are UI guardrails, not on-chain limits.
const MIN_RESALE_CAP_PERCENT = 100;
const MAX_RESALE_CAP_PERCENT = 1000;
const MIN_ROYALTY_PERCENT = 0;
const MAX_ROYALTY_PERCENT = 50;

export default function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof INDUSTRIES)[number]>('CONCERTS');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<(typeof INDUSTRIES)[number]>("CONCERTS");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [resaleCapPercent, setResaleCapPercent] = useState("120");
  const [royaltyPercent, setRoyaltyPercent] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<Organization>(`/organizations/${id}`),
      apiFetch<EventRecord[]>(`/organizations/${id}/events`),
    ])
      .then(([orgRes, eventsRes]) => {
        setOrg(orgRes);
        setEvents(eventsRes);
      })
      .finally(() => setLoadingData(false));
  }, [id, user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError('Ends at must be after Starts at');
    const resaleCap = Number(resaleCapPercent);
    const royalty = Number(royaltyPercent);
    if (
      !Number.isFinite(resaleCap) ||
      resaleCap < MIN_RESALE_CAP_PERCENT ||
      resaleCap > MAX_RESALE_CAP_PERCENT
    ) {
      setError(
        `Resale cap must be between ${MIN_RESALE_CAP_PERCENT}% and ${MAX_RESALE_CAP_PERCENT}% of face value.`,
      );
      return;
    }
    if (
      !Number.isFinite(royalty) ||
      royalty < MIN_ROYALTY_PERCENT ||
      royalty > MAX_ROYALTY_PERCENT
    ) {
      setError(
        `Royalty must be between ${MIN_ROYALTY_PERCENT}% and ${MAX_ROYALTY_PERCENT}%.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const event = await apiFetch<EventRecord>(`/organizations/${id}/events`, {
        method: 'POST',
        method: "POST",
        body: {
          name,
          category,
          venue,
          startsAt: new Date(startsAt).toISOString(),
          ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
        },
      });
      setEvents((prev) => [event, ...prev]);
      setName('');
      setVenue('');
      setStartsAt('');
      setEndsAt('');
          maxResaleMultiplierBps: Math.round(resaleCap * 100),
          royaltyBps: Math.round(royalty * 100),
        },
      });
      setEvents((prev) => [event, ...prev]);
      setName("");
      setVenue("");
      setStartsAt("");
      setResaleCapPercent("120");
      setRoyaltyPercent("5");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the event.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || loadingData || !org) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: org.name },
        ]}
      />
      <p className="text-sm text-muted">{INDUSTRY_LABELS[org.industry]}</p>
      <h1 className="font-heading text-3xl font-bold">{org.name}</h1>

      <h2 className="mt-10 font-heading text-xl font-bold">Events</h2>
      {events.length === 0 ? (
        <p className="mt-4 text-muted">No events yet — create one below.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="block rounded-lg border border-border p-4 hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{event.name}</span>
                  <StatusBadge status={event.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{event.venue}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 font-heading text-xl font-bold">Create an event</h2>
      <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
        <FormError message={error} />
        <label className="flex flex-col gap-1 text-sm">
          Event name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof INDUSTRIES)[number])
            }
            className="rounded-md border border-border bg-surface px-3 py-2"
          >
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {INDUSTRY_LABELS[i]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Venue
          <input
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Starts at
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ends at
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <Button
          type="submit"
          loading={submitting}
          className="self-start"
        >
          {submitting ? 'Creating…' : 'Create event'}
          Resale cap (% of face value)
          <input
            required
            type="number"
            inputMode="decimal"
            min={MIN_RESALE_CAP_PERCENT}
            max={MAX_RESALE_CAP_PERCENT}
            step="1"
            value={resaleCapPercent}
            onChange={(e) => setResaleCapPercent(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
          <span className="text-xs text-muted">
            The most a ticket can resell for, as a percentage of face value. 120
            means resales are capped at 1.2× face value; 100 means no markup is
            allowed.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Organizer royalty on resale (%)
          <input
            required
            type="number"
            inputMode="decimal"
            min={MIN_ROYALTY_PERCENT}
            max={MAX_ROYALTY_PERCENT}
            step="0.1"
            value={royaltyPercent}
            onChange={(e) => setRoyaltyPercent(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
          <span className="text-xs text-muted">
            Percentage of each resale that&apos;s paid to you automatically
            on-chain. Set to 0 for no royalty.
          </span>
        </label>
        <Button type="submit" loading={submitting} className="self-start">
          {submitting ? "Creating…" : "Create event"}
        </Button>
      </form>
    </div>
  );
}
