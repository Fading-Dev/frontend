import { describe, expect, it } from 'vitest';
import { buildStructuredData, GITHUB_LINKS, serializeJsonLd } from './structured-data';

describe('buildStructuredData', () => {
  const data = buildStructuredData('https://tickets.example.com/', 'desc');
  const [org, site] = data['@graph'];

  it('emits an Organization with name, url, logo and GitHub sameAs links', () => {
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe('StellarTickets');
    expect(org.url).toBe('https://tickets.example.com');
    expect(org.logo).toBe('https://tickets.example.com/icon');
    expect(org.sameAs).toEqual(GITHUB_LINKS);
  });

  it('emits a WebSite published by the Organization', () => {
    expect(site['@type']).toBe('WebSite');
    expect(site.url).toBe('https://tickets.example.com');
    expect(site.description).toBe('desc');
    expect(site.publisher).toEqual({ '@id': org['@id'] });
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so the payload cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(out).toContain('\\u003c/script>');
  });

  it('round-trips to the original data', () => {
    const input = { a: '<b>', n: 1 };
    expect(JSON.parse(serializeJsonLd(input))).toEqual(input);
  });
});
