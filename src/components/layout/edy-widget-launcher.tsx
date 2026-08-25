"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botón flotante presente en todo el layout (main) que abre/cierra un
 * <iframe> a /agente-edy (widget de voz de Edy). El iframe solo se monta
 * cuando el usuario abre el panel, para no pedir permiso de micrófono ni
 * cargar LiveKit en cada page load.
 */
export function EdyWidgetLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="h-[520px] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-background shadow-xl">
          <iframe
            src="/agente-edy"
            data-testid="edy-iframe"
            title="Edy, asistente de voz"
            allow="microphone"
            className="h-full w-full border-0"
          />
        </div>
      )}
      <Button
        size="icon-lg"
        className="rounded-full shadow-lg"
        data-testid="edy-launcher"
        aria-label={open ? "Cerrar a Edy" : "Hablar con Edy"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X /> : <MessageCircle />}
      </Button>
    </div>
  );
}
