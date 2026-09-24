import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { JsonLd } from '@/components/json-ld';
import { buildStructuredData } from '@/lib/structured-data';
import './globals.css';

const display = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], weight: ['500', '700'] });
const body = Inter({ variable: '--font-body', subsets: ['latin'] });

const DESCRIPTION =
  'Issue, manage, verify, transfer, and resell blockchain-powered tickets on the Stellar network — for concerts, flights, sports, festivals, conferences, and more.';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'StellarTickets — Tickets You Can Actually Verify',
    template: '%s · StellarTickets',
  },
  description: DESCRIPTION,
  openGraph: {
    title: 'StellarTickets — Tickets You Can Actually Verify',
    description: DESCRIPTION,
    siteName: 'StellarTickets',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StellarTickets — Tickets You Can Actually Verify',
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <JsonLd data={buildStructuredData(SITE_URL, DESCRIPTION)} />
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
