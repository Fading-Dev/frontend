'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { INDUSTRIES, INDUSTRY_LABELS, type EventRecord, type Organization } from '@/lib/types';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/button';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
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
    setSubmitting(true);
    try {
      const event = await apiFetch<EventRecord>(`/organizations/${id}/events`, {
        method: 'POST',
        body: { name, category, venue, startsAt: new Date(startsAt).toISOString() },
      });
      setEvents((prev) => [event, ...prev]);
      setName('');
      setVenue('');
      setStartsAt('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the event.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || loadingData || !org) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumbs
        className="mb-6"
        items={[{ label: 'Dashboard', href: '/dashboard' }, { label: org.name }]}
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
                  <span className="text-sm text-muted">{event.status}</span>
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
            onChange={(e) => setCategory(e.target.value as (typeof INDUSTRIES)[number])}
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
        <Button
          type="submit"
          loading={submitting}
          className="self-start"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </Button>
      </form>
    </div>
  );
}
