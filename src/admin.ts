import { env } from "cloudflare:workers";

const COOKIE = "__Host-fidelitiz_admin";
const SESSION_MS = 2 * 60 * 60 * 1000;
const LIMIT_MS = 15 * 60 * 1000;
const encoder = new TextEncoder();

function escape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function headers(contentType = "text/html; charset=utf-8"): HeadersInit {
  return {
    "content-type": contentType,
    "cache-control": "no-store, max-age=0",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "x-robots-tag": "noindex, nofollow, noarchive",
  };
}

function document(title: string, content: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} · FIDELITIZ</title><style>
    :root{font-family:Arial,Helvetica,sans-serif;color:#201b19;background:#f6f3ec}*{box-sizing:border-box}body{margin:0;min-height:100vh}button,input{font:inherit}a{color:inherit}.wrap{width:min(1120px,calc(100% - 36px));margin:auto}.top{border-bottom:1px solid #e5ded3;background:#fffdf8}.top .wrap{display:flex;justify-content:space-between;align-items:center;min-height:72px;gap:20px}.brand{font-size:22px;font-weight:900;letter-spacing:-.08em}.brand b{color:#d2805f}.top form{margin:0}.ghost{background:transparent;border:1px solid #bdb4a6;border-radius:9px;padding:10px 14px;color:#332b27;cursor:pointer}.login-shell{display:grid;place-items:center;min-height:calc(100vh - 73px);padding:40px 0}.login-card{width:min(430px,100%);background:#fffdf8;border:1px solid #e7ded0;box-shadow:0 18px 55px #2d221718;border-radius:20px;padding:34px}h1{font-size:clamp(29px,5vw,44px);letter-spacing:-.055em;line-height:1.06;margin:0 0 12px}p{line-height:1.45}.muted{color:#71675e}.login-card label{display:block;font-size:14px;font-weight:700;margin:28px 0 9px}.login-card input{width:100%;min-height:48px;border:1px solid #bfb4a6;border-radius:10px;background:#fff;padding:12px;outline-offset:2px}.primary{background:#211b19;color:#fff;border:0;border-radius:10px;padding:14px 18px;font-weight:700;cursor:pointer}.login-card .primary{width:100%;margin-top:18px}.error{background:#fff1ed;color:#8e3024;border-radius:9px;padding:12px 14px;font-size:14px}.dashboard{padding:48px 0 80px}.dashboard-head{display:flex;justify-content:space-between;align-items:end;gap:18px;margin-bottom:28px}.dashboard-head p{margin:10px 0 0;color:#71675e}.count{background:#f2d351;border-radius:999px;padding:8px 14px;font-weight:800;white-space:nowrap}.list{display:grid;gap:14px}.lead{background:#fffdf8;border:1px solid #e7ded0;border-radius:16px;padding:22px;display:grid;grid-template-columns:minmax(180px,1.1fr) minmax(150px,.9fr) minmax(230px,1.4fr);gap:14px 22px}.lead h2{font-size:20px;letter-spacing:-.03em;margin:0 0 5px}.lead p{margin:0}.lead small{color:#776c60}.lead .message{white-space:pre-wrap;overflow-wrap:anywhere}.lead .info{display:grid;gap:5px}.lead a{color:#975035;text-decoration-thickness:1px;text-underline-offset:3px;overflow-wrap:anywhere}.empty{background:#fffdf8;border:1px solid #e7ded0;border-radius:16px;padding:32px;color:#71675e}@media(max-width:750px){.lead{grid-template-columns:1fr}.dashboard-head{align-items:start;flex-direction:column}.login-card{padding:26px}.dashboard{padding-top:34px}}
    .lead{display:block;padding:0;overflow:hidden}.lead summary{list-style:none;cursor:pointer;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:15px}.lead summary::-webkit-details-marker{display:none}.lead summary::after{content:"＋";font-size:22px;color:#9d6a52}.lead[open] summary::after{content:"−"}.lead summary:hover{background:#fff8ed}.lead-summary{min-width:0}.lead-summary h2{overflow-wrap:anywhere}.lead-summary p{color:#665e57;margin:4px 0}.lead-status{display:inline-block;border-radius:999px;padding:6px 10px;background:#f3e3b7;color:#49351b;font-size:12px;font-weight:700;white-space:nowrap}.lead-status.done{background:#dfece0;color:#2e6338}.lead-body{border-top:1px solid #eee7dc;padding:22px;display:grid;gap:20px}.lead-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 24px;margin:0}.lead-fields div{min-width:0}.lead-fields dt{font-size:12px;color:#71675e;margin-bottom:4px}.lead-fields dd{margin:0;line-height:1.4;overflow-wrap:anywhere}.lead-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-top:1px solid #eee7dc;padding-top:18px}.lead-actions form{margin:0}.danger{color:#9d3328;border-color:#d7a097}.notice{padding:13px 16px;border-radius:10px;background:#fff2de}.confirm-card{max-width:530px}.confirm-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.confirm-actions a{display:inline-flex;align-items:center;padding:12px 16px;border-radius:10px;border:1px solid #bdb4a6;text-decoration:none}@media(max-width:650px){.lead-fields{grid-template-columns:1fr}.lead summary{padding:18px}.lead-body{padding:18px}}
  </style></head><body><header class="top"><div class="wrap"><span class="brand">FIDELITIZ<b>.</b></span>${content.startsWith("<main class=\"dashboard") ? '<form method="post" action="/admin/logout"><button class="ghost" type="submit">Se déconnecter</button></form>' : ""}</div></header>${content}</body></html>`, { status, headers: headers() });
}

function redirect(location: string, cookie?: string): Response {
  const h = new Headers(headers());
  h.set("location", location);
  if (cookie) h.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers: h });
}

function cookieValue(request: Request): string | null {
  const entry = request.headers.get("cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`));
  return entry?.slice(COOKIE.length + 1) ?? null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function passwordConfig(): { salt: Uint8Array; hash: Uint8Array } | null {
  const parts = env.ADMIN_PASSWORD_HASH?.split("$");
  if (!parts || parts.length !== 3 || parts[0] !== "sha256-random") return null;
  try {
    const salt = Uint8Array.from(atob(parts[1]), char => char.charCodeAt(0));
    const hash = Uint8Array.from(atob(parts[2]), char => char.charCodeAt(0));
    return salt.length === 16 && hash.length === 32 ? { salt, hash } : null;
  } catch { return null; }
}

async function passwordMatches(password: string, config: NonNullable<ReturnType<typeof passwordConfig>>): Promise<boolean> {
  const input = new Uint8Array(config.salt.length + encoder.encode(password).length);
  input.set(config.salt);
  input.set(encoder.encode(password), config.salt.length);
  const result = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  let difference = 0;
  for (let i = 0; i < result.length; i++) difference |= result[i] ^ config.hash[i];
  return difference === 0;
}

async function session(request: Request): Promise<string | null> {
  const token = cookieValue(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = await digest(token);
  const row = await env.DB.prepare("SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?")
    .bind(hash, Date.now()).first<{ token_hash: string }>();
  return row ? hash : null;
}

function loginPage(error = false): Response {
  return document("Administration", `<main class="login-shell wrap"><section class="login-card"><h1>Espace administrateur</h1><p class="muted">Consultez les demandes de démonstration reçues.</p>${error ? '<p class="error" role="alert">Mot de passe incorrect ou trop de tentatives. Réessayez plus tard.</p>' : ""}<form method="post" action="/admin/login"><label for="password">Mot de passe</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button class="primary" type="submit">Se connecter</button></form></section></main>`);
}

type Lead = { id: string; first_name: string; last_name: string; email: string; phone: string | null; business: string; interest: string; siren: string | null; siret: string | null; address: string | null; postal_code: string | null; city: string | null; activity: string | null; legal_form: string | null; message: string; status: string; created_at: string };

function detail(label: string, value: string | null | undefined) {
  return `<div><dt>${escape(label)}</dt><dd>${value ? escape(value) : "Non renseigné"}</dd></div>`;
}

function leadCard(lead: Lead, csrf: string): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const date = new Date(lead.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  return `<details class="lead"><summary><div class="lead-summary"><h2>${escape(lead.business)}</h2><p>${escape(name || "Entreprise trouvée dans l’annuaire")}</p><small>${escape(date)}</small></div><span class="lead-status ${lead.status === "fait" ? "done" : ""}">${lead.status === "fait" ? "Fait" : "À contacter"}</span></summary><div class="lead-body"><dl class="lead-fields">
    ${detail("Entreprise", lead.business)}${detail("SIREN", lead.siren)}${detail("SIRET", lead.siret)}${detail("Adresse", lead.address)}${detail("Code postal", lead.postal_code)}${detail("Ville", lead.city)}${detail("Activité", lead.activity)}${detail("Forme juridique", lead.legal_form)}${detail("Nom du contact", name)}${detail("E-mail", lead.email)}${detail("Téléphone", lead.phone)}${detail("Origine", lead.interest)}${detail("Date de réception", date)}${detail("Message", lead.message)}
    </dl>${!lead.email && !lead.phone ? '<p class="notice">L’annuaire ne fournit pas de coordonnées directes. Utilisez le SIREN et l’adresse pour retrouver le commerce.</p>' : ""}<div class="lead-actions">
    ${lead.status !== "fait" ? `<form method="post" action="/admin/lead"><input type="hidden" name="id" value="${escape(lead.id)}"><input type="hidden" name="csrf" value="${escape(csrf)}"><input type="hidden" name="action" value="done"><button class="primary" type="submit">Marquer comme fait</button></form>` : ""}
    <a class="ghost danger" href="/admin/lead/delete?id=${encodeURIComponent(lead.id)}">Supprimer…</a>
    </div></div></details>`;
}

export async function page(request: Request): Promise<Response> {
  try {
    if (!passwordConfig() || !env.DB) return document("Administration indisponible", '<main class="login-shell wrap"><section class="login-card"><h1>Espace indisponible</h1><p>La configuration sécurisée de l’administration doit être terminée.</p></section></main>', 503);
    const csrf = await session(request);
    if (!csrf) return loginPage(new URL(request.url).searchParams.has("erreur"));
    const rows = await env.DB.prepare("SELECT id,first_name,last_name,email,phone,business,interest,siren,siret,address,postal_code,city,activity,legal_form,message,status,created_at FROM contact_leads ORDER BY created_at DESC LIMIT 100").all<Lead>();
    const leads = rows.results ?? [];
    const items = leads.map(lead => leadCard(lead, csrf)).join("");
    return document("Demandes de démo", `<main class="dashboard wrap"><div class="dashboard-head"><div><h1>Demandes de démo</h1><p>Les demandes les plus récentes apparaissent en premier.</p></div><span class="count">${leads.length} demande${leads.length > 1 ? "s" : ""}</span></div><div class="list">${items || '<p class="empty">Aucune demande reçue pour le moment.</p>'}</div></main>`);
  } catch { return document("Administration indisponible", '<main class="login-shell wrap"><section class="login-card"><h1>Service momentanément indisponible</h1><p>Réessayez plus tard.</p></section></main>', 503); }
}

export async function deletePage(request: Request): Promise<Response> {
  try {
    const csrf = await session(request);
    if (!csrf) return redirect("/admin/");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9-]{36}$/.test(id)) return redirect("/admin/");
    const lead = await env.DB.prepare("SELECT business FROM contact_leads WHERE id=?").bind(id).first<{ business: string }>();
    if (!lead) return redirect("/admin/");
    return document("Supprimer la demande", `<main class="login-shell wrap"><section class="login-card confirm-card"><h1>Supprimer cette demande ?</h1><p><strong>${escape(lead.business)}</strong> sera retirée définitivement de la liste.</p><div class="confirm-actions"><a href="/admin/">Annuler</a><form method="post" action="/admin/lead"><input type="hidden" name="id" value="${escape(id)}"><input type="hidden" name="csrf" value="${escape(csrf)}"><input type="hidden" name="action" value="delete"><button class="primary" type="submit">Supprimer définitivement</button></form></div></section></main>`);
  } catch { return redirect("/admin/"); }
}

export async function leadAction(request: Request): Promise<Response> {
  try {
    const csrf = await session(request);
    if (!csrf) return redirect("/admin/");
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/x-www-form-urlencoded") return new Response("Unsupported Media Type", { status: 415, headers: headers("text/plain; charset=utf-8") });
    const raw = await request.text();
    if (raw.length > 1000) return redirect("/admin/");
    const input = new URLSearchParams(raw);
    const id = input.get("id") ?? "";
    if (input.get("csrf") !== csrf) return new Response("Jeton de formulaire invalide", { status: 403, headers: headers("text/plain; charset=utf-8") });
    if (!/^[a-f0-9-]{36}$/.test(id)) return new Response("Identifiant de demande invalide", { status: 400, headers: headers("text/plain; charset=utf-8") });
    if (input.get("action") === "done") {
      await env.DB.prepare("UPDATE contact_leads SET status='fait' WHERE id=?").bind(id).run();
    } else if (input.get("action") === "delete") {
      await env.DB.prepare("DELETE FROM contact_leads WHERE id=?").bind(id).run();
    } else return new Response("Bad Request", { status: 400, headers: headers("text/plain; charset=utf-8") });
    return redirect("/admin/");
  } catch { return new Response("Service unavailable", { status: 503, headers: headers("text/plain; charset=utf-8") }); }
}

export async function login(request: Request): Promise<Response> {
  const config = passwordConfig();
  if (!config || !env.DB) return new Response("Service unavailable", { status: 503, headers: headers("text/plain; charset=utf-8") });
  try {
    if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) return new Response("Unsupported Media Type", { status: 415, headers: headers("text/plain; charset=utf-8") });
    const raw = await request.text();
    if (raw.length > 2048) return redirect("/admin/?erreur=1");
    const password = new URLSearchParams(raw).get("password") ?? "";
    if (!password || password.length > 1024) return redirect("/admin/?erreur=1");
    const now = Date.now();
    const key = await digest(`${request.headers.get("cf-connecting-ip") || "unknown"}:${env.ADMIN_PASSWORD_HASH}`);
    const row = await env.DB.prepare("INSERT INTO admin_login_attempts (key_hash,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END RETURNING attempts")
      .bind(key, now, now - LIMIT_MS, now - LIMIT_MS).first<{ attempts: number }>();
    if (!row || row.attempts > 5 || !await passwordMatches(password, config)) return redirect("/admin/?erreur=1");
    const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.batch([
      env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM admin_login_attempts WHERE key_hash=?").bind(key),
      env.DB.prepare("INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)").bind(await digest(token), now + SESSION_MS),
    ]);
    return redirect("/admin/", `${COOKIE}=${token}; Path=/; Max-Age=7200; Secure; HttpOnly; SameSite=Strict`);
  } catch { return new Response("Service unavailable", { status: 503, headers: headers("text/plain; charset=utf-8") }); }
}

export async function logout(request: Request): Promise<Response> {
  try {
    const hash = await session(request);
    if (hash) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(hash).run();
  } catch { /* Effacer le cookie même si D1 est momentanément indisponible. */ }
  return redirect("/admin/", `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
}
