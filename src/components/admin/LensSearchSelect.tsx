import { useMemo, useState } from "react";
import { brl } from "@/lib/admin";
import { Input } from "@/components/ui/input";

export type LensSearchProduct = {
  id: string;
  name: string;
  refraction_index?: string | null;
  price_cents: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function LensSearchSelect(props: {
  products: LensSearchProduct[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = props.products.find((p) => p.id === props.value) ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return props.products.slice(0, 60);
    return props.products
      .filter(
        (p) =>
          normalize(p.name).includes(q) ||
          (p.refraction_index ? normalize(p.refraction_index).includes(q) : false),
      )
      .slice(0, 60);
  }, [props.products, query]);

  return (
    <div className={`relative ${props.className ?? ""}`}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 text-left text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected
            ? `${selected.name}${selected.refraction_index ? ` ${selected.refraction_index}` : ""} — ${brl(selected.price_cents)}`
            : (props.placeholder ?? "Escolher lente da tabela")}
        </span>
        <span className="text-muted-foreground">▾</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-10 z-50 rounded-md border border-border bg-popover p-2 shadow-lg">
            <Input
              autoFocus
              className="h-8 text-xs"
              placeholder="Buscar lente pelo nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 max-h-60 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Nenhuma lente encontrada.
                </p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary ${
                    p.id === props.value ? "bg-secondary" : ""
                  }`}
                  onClick={() => {
                    props.onChange(p.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-medium">{p.name}</span>
                  {p.refraction_index ? ` ${p.refraction_index}` : ""} — {brl(p.price_cents)}
                </button>
              ))}
              {props.products.length > 60 && !query && (
                <p className="px-2 py-2 text-[11px] text-muted-foreground">
                  Digite para buscar entre as {props.products.length} lentes.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
