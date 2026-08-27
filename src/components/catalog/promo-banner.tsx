"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "promo-banner-dismissed";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function isDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Sin persistencia disponible; el banner ya se ocultó en esta vista.
  }
  listeners.forEach((fn) => fn());
}

interface PromoBannerProps {
  /** Titular corto de la oferta. */
  title?: string;
  /** Detalle secundario de la oferta. */
  detail?: string;
}

export function PromoBanner({
  title = "Oferta por tiempo limitado",
  detail = "-30% en todos los cursos. Aprovecha antes de que termine.",
}: PromoBannerProps) {
  // El server y el primer render de cliente devuelven `true` (getServerSnapshot),
  // así el markup coincide y React lo reconcilia tras montar sin parpadeo.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  const dismiss = useCallback(() => setDismissed(), []);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Promoción"
      className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3"
    >
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{title}:</span> {detail}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Descartar promoción"
        className="-my-1 -mr-1.5 shrink-0"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
