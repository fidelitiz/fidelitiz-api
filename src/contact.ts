import { env } from "cloudflare:workers";

const ORIGINS = new Set(["https://fidelitiz.github.io", "https://fidelitiz-pro-beta.github.io", "https://fidelitiz.fr", "https://www.fidelitiz.fr"]);
function allowed(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return origin === new URL(request.url).origin || origin === "null" || ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}
function headers(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": allowed(request) ? origin : new URL(request.url).origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    vary: "Origin",
  };
}
function response(request: Request, status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}
function field(input: Record<string, unknown>, name: string, max: number) {
  const value = input[name];
  return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}
export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: headers(request) });
}
export async function POST(request: Request) {
  try {
    if (!allowed(request)) return response(request, 403, { error: "Origine refusée." });
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return response(request, 415, { error: "Format invalide." });
    const raw = await request.text();
    if (raw.length > 8000) return response(request, 413, { error: "Message trop volumineux." });
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (field(input, "website", 200)) return response(request, 202, { ok: true });
    const names = ["firstName", "lastName", "email", "phone", "business", "siren", "siret", "address", "postalCode", "city", "activity", "legalForm", "message"] as const;
    const limits = [80, 80, 254, 40, 120, 9, 14, 180, 10, 100, 20, 20, 2000] as const;
    const data = Object.fromEntries(names.map((name, index) => [name, field(input, name, limits[index])])) as Record<typeof names[number], string>;
    const { firstName, lastName, phone, business, siren, siret, address, postalCode, city, activity, legalForm, message } = data;
    const email = data.email.toLowerCase();
    const directory = input.mode === "directory";
    if (!business || business.length > 120 || firstName.length > 80 || lastName.length > 80 ||
      email.length > 254 || phone.length > 40 || address.length > 180 ||
      postalCode.length > 10 || city.length > 100 || activity.length > 20 ||
      legalForm.length > 20 || message.length > 2000 ||
      (siren && !/^\d{9}$/.test(siren)) || (siret && !/^\d{14}$/.test(siret))) {
      return response(request, 400, { error: "Vérifiez les champs du formulaire." });
    }
    if (directory ? (!/^\d{9}$/.test(siren) || firstName || lastName || email || phone) :
      (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.consent !== true)) {
      return response(request, 400, { error: "Vérifiez les champs du formulaire." });
    }
    const db = env.DB;
    if (!db) throw new Error("D1 indisponible");
    const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
    const recent = await db.prepare(directory
      ? "SELECT count(*) AS n FROM contact_leads WHERE siren=? AND created_at>?"
      : "SELECT count(*) AS n FROM contact_leads WHERE email=? AND created_at>?")
      .bind(directory ? siren : email, cutoff).first<{ n: number }>();
    if ((recent?.n ?? 0) >= (directory ? 3 : 5)) return response(request, 429, { error: "Trop de demandes récentes. Réessayez plus tard." });
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("DELETE FROM contact_leads WHERE created_at<?")
        .bind(new Date(Date.now() - 180 * 86_400_000).toISOString()),
      db.prepare("INSERT INTO contact_leads (id,first_name,last_name,email,phone,business,interest,siren,siret,address,postal_code,city,activity,legal_form,message,consent_at,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), firstName, lastName, email, phone || null, business,
          directory ? "Annuaire" : "Présentation", siren || null, siret || null, address || null, postalCode || null, city || null,
          activity || null, legalForm || null, message, now, now, "nouvelle"),
    ]);
    return response(request, 201, { ok: true });
  } catch {
    return response(request, 500, { error: "La demande n’a pas pu être enregistrée. Réessayez plus tard." });
  }
}
