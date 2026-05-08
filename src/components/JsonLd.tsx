import { useEffect } from "react";

interface JsonLdProps {
  id: string; // unique id so multiple schemas can coexist on one page
  schema: Record<string, unknown>;
}

export function JsonLd({ id, schema }: JsonLdProps) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let el = document.getElementById(scriptId);
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.setAttribute("type", "application/ld+json");
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
    return () => { document.getElementById(scriptId)?.remove(); };
  }, [id, schema]);

  return null;
}
