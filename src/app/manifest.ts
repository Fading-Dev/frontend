import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StellarTickets — Tickets You Can Actually Verify',
    short_name: 'StellarTickets',
    description:
      'Issue, manage, verify, transfer, and resell blockchain-powered tickets on the Stellar network.',
    start_url: '/',
    display: 'standalone',
  };
}
