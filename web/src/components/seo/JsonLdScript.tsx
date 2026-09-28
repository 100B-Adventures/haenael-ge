import { serializeJsonLd } from "@/lib/seo/structured-data";

interface JsonLdScriptProps {
  id: string;
  data: Record<string, unknown>;
}

export function JsonLdScript({ id, data }: JsonLdScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
