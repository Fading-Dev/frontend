import { describe, expect, it } from 'vitest';
import {
  buildPublishSummary,
  formatEventDate,
  formatResaleCap,
  formatRoyalty,
  ticketingContractUrl,
} from './event-details';

describe('formatRoyalty', () => {
  it('converts basis points to a percentage', () => {
    expect(formatRoyalty(500)).toBe('5%');
    expect(formatRoyalty(250)).toBe('2.5%');
    expect(formatRoyalty(0)).toBe('0%');
  });
});

describe('formatResaleCap', () => {
  it('converts basis points to a face-value multiplier', () => {
    expect(formatResaleCap(15_000)).toBe('1.5× face value');
    expect(formatResaleCap(20_000)).toBe('2× face value');
  });

  it('calls out a 1× cap as no markup', () => {
    expect(formatResaleCap(10_000)).toBe('1× face value (no markup)');
  });
});

describe('formatEventDate', () => {
  it('formats an ISO timestamp with date and time', () => {
    const out = formatEventDate('2026-06-20T19:00:00.000Z', 'en-GB', 'UTC');
    expect(out).toContain('20 Jun 2026');
    expect(out).toContain('19:00');
  });
});

describe('buildPublishSummary', () => {
  it('lists the key event details and resale cap before publishing', () => {
    const summary = buildPublishSummary({
      name: 'Summer Fest',
      startsAt: '2026-06-20T19:00:00.000Z',
      endsAt: '2026-06-21T00:00:00.000Z',
      venue: 'Harbor Stage',
      maxResaleMultiplierBps: 15_000,
      ticketTypes: [
        { name: 'VIP', quantityTotal: 25, price: '2000' },
        { name: 'GA', quantityTotal: 100, price: '1000' },
      ],
    });

    expect(summary).toContain('Summer Fest');
    expect(summary).toContain('Harbor Stage');
    expect(summary).toContain('VIP');
    expect(summary).toContain('GA');
    expect(summary).toContain('1.5× face value');
    expect(summary).toContain('Date');
    expect(summary).toContain('Venue');
  });
});

describe('ticketingContractUrl', () => {
  it('links testnet and mainnet contracts on stellar.expert', () => {
    expect(ticketingContractUrl('CABC', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/contract/CABC',
    );
    expect(ticketingContractUrl('CABC', 'mainnet')).toBe(
      'https://stellar.expert/explorer/public/contract/CABC',
    );
  });

  it('returns null without a contract id or for unsupported networks', () => {
    expect(ticketingContractUrl(undefined, 'testnet')).toBeNull();
    expect(ticketingContractUrl('', 'testnet')).toBeNull();
    expect(ticketingContractUrl('CABC', 'futurenet')).toBeNull();
  });
});
