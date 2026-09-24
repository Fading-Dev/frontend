/**
 * schema.org JSON-LD for the site (WebSite + Organization), rendered once in
 * the root layout so search engines can attribute the site to StellarTickets.
 */

export const GITHUB_LINKS = [
  'https://github.com/StellarTickets',
  'https://github.com/StellarTickets/frontend',
  'https://github.com/StellarTickets/backend',
  'https://github.com/StellarTickets/blockchain',
];

export function buildStructuredData(siteUrl: string, description: string) {
  const url = siteUrl.replace(/\/+$/, '');
  const orgId = `${url}/#organization`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'StellarTickets',
        url,
        logo: `${url}/icon`,
        sameAs: GITHUB_LINKS,
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        name: 'StellarTickets',
        url,
        description,
        publisher: { '@id': orgId },
      },
    ],
  };
}

/**
 * JSON.stringify, with `<` escaped to `\u003c` so a value containing
 * `</script>` can't break out of the inline script tag. The result is still
 * valid JSON that parses back to the same data.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
