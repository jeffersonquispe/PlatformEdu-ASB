import { NextResponse } from "next/server";

/**
 * Verifica el header Authorization: Bearer <AGENT_API_KEY> que envía el
 * agente de voz Edy (backend_client.py) en cada llamada a /api/agent/*.
 * Devuelve una NextResponse de error si la verificación falla, o null si
 * la request está autorizada.
 */
export function checkAgentAuth(request: Request): NextResponse | null {
  const secret = process.env.AGENT_API_KEY;
  if (!secret) {
    console.error("AGENT_API_KEY no configurado: rechazando request a /api/agent/*");
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida que un studentId recibido del agente tenga forma de UUID antes de usarlo en queries. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
