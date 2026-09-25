'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { INDUSTRIES, INDUSTRY_LABELS, type Organization } from '@/lib/types';
import { FormError } from '@/components/form-error';
import { WalletConnectButton } from '@/components/wallet-connect-button';
import { Button } from '@/components/button';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>('CONCERTS');
  const [stellarAccount, setStellarAccount] = useState(user?.stellarPublicKey ?? '');
  // True once the user edits the field, so wallet updates stop overriding their input.
  const stellarAccountTouched = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (stellarAccountTouched.current) return;
    setStellarAccount(user?.stellarPublicKey ?? '');
  }, [user?.stellarPublicKey]);

  useEffect(() => {
    if (!user) return;

    async function loadOrgs() {
      const res = await apiFetch<Organization[]>('/organizations/mine');
      setOrgs(res);
      setLoadingOrgs(false);
    }
    void loadOrgs();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const org = await apiFetch<Organization>('/organizations', {
        method: 'POST',
        body: { name, slug, industry, stellarAccount },
      });
      setOrgs((prev) => [org, ...prev]);
      setName('');
      setSlug('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the organization.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold">Your organizations</h1>
      <div className="mt-4">
        <WalletConnectButton />
      </div>

      {loadingOrgs ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : orgs.length === 0 ? (
        <p className="mt-8 text-muted">You don’t have an organization yet — create one below.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={`/dashboard/organizations/${org.id}`}
                className="block rounded-lg border border-border p-4 hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{org.name}</span>
                  <span className="text-sm text-muted">{INDUSTRY_LABELS[org.industry]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 font-heading text-xl font-bold">Create an organization</h2>
      <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
        <FormError message={error} />
        <label className="flex flex-col gap-1 text-sm">
          Organization name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Slug
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="my-organization"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Industry
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as (typeof INDUSTRIES)[number])}
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
          Stellar account (G…)
          <input
            required
            pattern="G[A-Z0-9]{55}"
            value={stellarAccount}
            onChange={(e) => {
              stellarAccountTouched.current = true;
              setStellarAccount(e.target.value);
            }}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs"
          />
          <span className="text-xs text-muted">
            The Stellar account that will sign on-chain writes for this organization — connect
            your wallet above to prefill your own address.
          </span>
        </label>
        <Button
          type="submit"
          loading={submitting}
          className="self-start"
        >
          {submitting ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </div>
  );
}
