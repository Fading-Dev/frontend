import { serializeJsonLd } from '@/lib/structured-data';

/** Server component that injects schema.org JSON-LD into the page. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // serializeJsonLd escapes '<', so the payload can't close this tag.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
