import { env } from "cloudflare:workers";

type MemberRow = {
  session_id: string; code: string; first_name: string; last_name: string;
  member_number: string; status: string; points: number; initial_points: number;
  last_visit_at: string | null;
};
type TransactionRow = {
  id: string; session_id: string; code: string; kind: string; points: number;
  previous_points: number; amount_cents: number | null; receipt_key: string | null;
  created_at: string; undone: number;
};
type NotificationRow = { id: string; code: string; title: string; body: string; created_at: string; send_at: string; paused: number };
type ReviewRow = { id: string; slug: string; name: string; rating: number; comment: string; source: string; status: string; note: string; created_at: string };
type AutomationRow = { id: string; trigger: string; title: string; body: string; paused: number; created_at: string };
type NfcCardRow = { id: string; slug: string; label: string; location: string; status: string; color: string };

const CARD_CODES = ["FDZ-DEMO-CAMILLE", "FDZ-DEMO-JULIEN"] as const;
const SEED = [
  { code: CARD_CODES[0], first: "Camille", last: "R.", number: "2048 0418", status: "Habituée", points: 340 },
  { code: CARD_CODES[1], first: "Julien", last: "M.", number: "2048 0592", status: "Fidèle", points: 520 },
] as const;
const SESSION = /^[a-f0-9-]{36}$/i;
const RULES = { mode: "points", earnSpend: 1, earnPoints: 10, stampsPerVisit: 1, cashbackPercent: 5, rewardThreshold: 500, rewardName: "Un café au choix offert" };
function db() {
  if (!env.DB) throw new Error('D1 indisponible');
  return env.DB;
}

function headers(request: Request) {
  const origin = request.headers.get("origin") || "";
  const self = new URL(request.url).origin;
  const allowed = origin === self || origin === "https://fidelitiz.github.io" || origin === "https://fidelitiz.fr" || origin === "https://www.fidelitiz.fr" || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": allowed ? origin : self,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}
function reply(request: Request, status: number, data: object) {
  return new Response(JSON.stringify({ ...data, status }), { status, headers: headers(request) });
}
async function seed(sessionId: string) {
  await db().batch(SEED.map((item) => db().prepare(
    "INSERT OR IGNORE INTO demo_members (session_id,code,first_name,last_name,member_number,status,points,initial_points,last_visit_at) VALUES (?,?,?,?,?,?,?,?,NULL)"
  ).bind(sessionId, item.code, item.first, item.last, item.number, item.status, item.points, item.points)));
}
async function getMember(sessionId: string, code: string) {
  return db().prepare("SELECT * FROM demo_members WHERE session_id=? AND code=?").bind(sessionId, code).first<MemberRow>();
}
function member(row: MemberRow) {
  return {
    code: row.code, memberNumber: row.member_number, firstName: row.first_name, lastName: row.last_name,
    status: row.status, points: row.points, balanceLabel: "POINTS", balanceValue: String(row.points),
    nextReward: row.points >= 500 ? "Café offert disponible" : `Encore ${500 - row.points} pts`,
    rewardReady: row.points >= 500,
    lastVisitAt: row.last_visit_at ?? (SEED.some((item) => item.code === row.code) ? new Date(Date.now() - 3 * 86_400_000).toISOString() : null),
    rules: RULES,
  };
}
function transaction(row: TransactionRow) {
  return { id: row.id, kind: row.kind, points: row.points, amountCents: row.amount_cents, createdAt: row.created_at, receipt: row.receipt_key, undone: Boolean(row.undone) };
}
async function history(sessionId: string, code: string) {
  const rows = await db().prepare("SELECT * FROM demo_transactions WHERE session_id=? AND code=? ORDER BY created_at DESC LIMIT 20").bind(sessionId, code).all<TransactionRow>();
  return rows.results.map(transaction);
}
async function emitAutomation(sessionId: string, trigger: string, code: string = CARD_CODES[0]) {
  const rows = await db().prepare("SELECT * FROM demo_automations WHERE session_id=? AND trigger=? AND paused=0").bind(sessionId, trigger).all<AutomationRow>();
  const now = new Date().toISOString();
  if (rows.results.length) await db().batch(rows.results.map((row) => db().prepare("INSERT INTO demo_notifications (id,session_id,code,title,body,created_at,send_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), sessionId, code, row.title, row.body, now, now)));
}
const REVIEW_SLUGS = new Map([['marcel-republique', 'NFC-001'], ['marcel-batignolles', 'NFC-002']]);
function publicReview(row: ReviewRow, threshold: number, cardId?: string) {
  return { id: row.id, merchantId: 'cafe-marcel', cardId: cardId ?? REVIEW_SLUGS.get(row.slug), name: row.name, rating: row.rating, comment: row.comment, date: row.created_at, source: row.source, status: row.status, note: row.note, googleOpened: row.rating >= threshold };
}
function publicNfcCard(row: NfcCardRow) {
  return { id: row.id, merchantId: 'cafe-marcel', slug: row.slug, label: row.label, location: row.location, status: row.status, color: row.color, taps: 0, scans: 0 };
}

export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: headers(request) }); }

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 8192) return reply(request, 413, { error: "Requête trop volumineuse." });
    const input = JSON.parse(raw) as Record<string, unknown>;
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    if (!SESSION.test(sessionId)) return reply(request, 400, { error: "Session de test invalide." });
    const action = input.action;
    if (action === "bootstrap") {
      await seed(sessionId);
      const rows = await db().prepare("SELECT * FROM demo_members WHERE session_id=? ORDER BY code").bind(sessionId).all<MemberRow>();
      return reply(request, 200, { data: { members: rows.results.map(member) } });
    }
    const code = typeof input.code === "string" ? input.code.trim() : "";
    await seed(sessionId);
    if (action === "resetActivity") {
      await db().batch([
        db().prepare("DELETE FROM demo_transactions WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_notifications WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_automations WHERE session_id=?").bind(sessionId),
        db().prepare("UPDATE demo_members SET points=initial_points,last_visit_at=NULL WHERE session_id=?").bind(sessionId),
      ]);
      return reply(request, 200, { data: { reset: true } });
    }
    if (action === "reset") {
      await db().batch([
        db().prepare("DELETE FROM demo_transactions WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_notifications WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_reviews WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_nfc_settings WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_nfc_cards WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_automations WHERE session_id=?").bind(sessionId),
        db().prepare("DELETE FROM demo_members WHERE session_id=? AND code NOT IN (?,?)").bind(sessionId, ...CARD_CODES),
        db().prepare("UPDATE demo_members SET points=initial_points,last_visit_at=NULL WHERE session_id=?").bind(sessionId),
      ]);
      return reply(request, 200, { data: { reset: true } });
    }
    if (action === "notifications") {
      const target = code || CARD_CODES[0];
      const rows = await db().prepare("SELECT id,code,title,body,created_at,send_at,paused FROM demo_notifications WHERE session_id=? AND code=? ORDER BY created_at DESC LIMIT 30").bind(sessionId, target).all<NotificationRow>();
      return reply(request, 200, { data: { notifications: rows.results.map((row) => ({ id: row.id, code: row.code, title: row.title, body: row.body, createdAt: row.created_at, sendAt: row.send_at, paused: Boolean(row.paused), delivered: !row.paused && Date.parse(row.send_at) <= Date.now() })) } });
    }
    if (action === "notificationPause") {
      const id = typeof input.id === 'string' ? input.id : '';
      const paused = input.paused === true ? 1 : 0;
      const result = await db().prepare("UPDATE demo_notifications SET paused=? WHERE session_id=? AND id=?").bind(paused, sessionId, id).run();
      if (!result.meta.changes) return reply(request, 404, { error: "Notification introuvable." });
      return reply(request, 200, { data: { paused: Boolean(paused) } });
    }
    if (action === 'automations') {
      const rows = await db().prepare("SELECT * FROM demo_automations WHERE session_id=? ORDER BY created_at DESC LIMIT 30").bind(sessionId).all<AutomationRow>();
      return reply(request, 200, { data: { automations: rows.results.map((row) => ({ id: row.id, trigger: row.trigger, title: row.title, body: row.body, paused: Boolean(row.paused), createdAt: row.created_at })) } });
    }
    if (action === 'automationSave') {
      const trigger = typeof input.trigger === 'string' ? input.trigger : '';
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      if (!['Récompense débloquée', '30 jours sans visite', 'Anniversaire du membre', 'Points bientôt expirés', 'Nouvelle carte ajoutée'].includes(trigger) || !title || title.length > 45 || !body || body.length > 180) return reply(request, 400, { error: 'Automatisation invalide.' });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db().prepare("INSERT INTO demo_automations (id,session_id,trigger,title,body,created_at) VALUES (?,?,?,?,?,?)").bind(id, sessionId, trigger, title, body, now).run();
      return reply(request, 200, { data: { automation: { id, trigger, title, body, paused: false, createdAt: now } } });
    }
    if (action === 'automationPause') {
      const id = typeof input.id === 'string' ? input.id : '';
      const paused = input.paused === true ? 1 : 0;
      const result = await db().prepare("UPDATE demo_automations SET paused=? WHERE session_id=? AND id=?").bind(paused, sessionId, id).run();
      if (!result.meta.changes) return reply(request, 404, { error: 'Automatisation introuvable.' });
      return reply(request, 200, { data: { paused: Boolean(paused) } });
    }
    if (action === 'automationSimulate') {
      const id = typeof input.id === 'string' ? input.id : '';
      const row = await db().prepare("SELECT * FROM demo_automations WHERE session_id=? AND id=? AND paused=0").bind(sessionId, id).first<AutomationRow>();
      if (!row) return reply(request, 404, { error: 'Automatisation inactive ou introuvable.' });
      const now = new Date().toISOString();
      await db().prepare("INSERT INTO demo_notifications (id,session_id,code,title,body,created_at,send_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), sessionId, CARD_CODES[0], row.title, row.body, now, now).run();
      return reply(request, 200, { data: { sent: true } });
    }
    if (action === "notificationSend") {
      const target = code || CARD_CODES[0];
      if (!(await getMember(sessionId, target))) return reply(request, 404, { error: "Carte inconnue." });
      const title = typeof input.title === "string" ? input.title.trim() : "";
      const body = typeof input.body === "string" ? input.body.trim() : "";
      const requested = typeof input.sendAt === "string" ? Date.parse(input.sendAt) : NaN;
      if (!title || title.length > 45 || !body || body.length > 180) return reply(request, 400, { error: "Titre ou message invalide." });
      if (input.sendAt && (!Number.isFinite(requested) || requested > Date.now() + 366 * 86400000)) return reply(request, 400, { error: "Date d’envoi invalide." });
      const now = new Date().toISOString();
      const sendAt = input.sendAt ? new Date(requested).toISOString() : now;
      const id = crypto.randomUUID();
      await db().prepare("INSERT INTO demo_notifications (id,session_id,code,title,body,created_at,send_at) VALUES (?,?,?,?,?,?,?)").bind(id, sessionId, target, title, body, now, sendAt).run();
      return reply(request, 200, { data: { notification: { id, code: target, title, body, createdAt: now, sendAt, paused: false, delivered: Date.parse(sendAt) <= Date.now() } } });
    }
    if (action === "nfcSettings") {
      const row = await db().prepare("SELECT threshold,google_url FROM demo_nfc_settings WHERE session_id=?").bind(sessionId).first<{ threshold: number; google_url: string }>();
      return reply(request, 200, { data: { threshold: row?.threshold ?? 4, googleUrl: row?.google_url ?? '' } });
    }
    if (action === "nfcCards") {
      const rows = await db().prepare("SELECT id,slug,label,location,status,color FROM demo_nfc_cards WHERE session_id=? ORDER BY rowid DESC").bind(sessionId).all<NfcCardRow>();
      return reply(request, 200, { data: { cards: rows.results.map(publicNfcCard) } });
    }
    if (action === "nfcCardSave") {
      const id = typeof input.id === "string" ? input.id.trim() : "";
      const slug = typeof input.slug === "string" ? input.slug.trim() : "";
      const label = typeof input.label === "string" ? input.label.trim() : "";
      const location = typeof input.location === "string" ? input.location.trim() : "";
      const status = typeof input.status === "string" ? input.status : "";
      const color = typeof input.color === "string" ? input.color : "";
      if (!/^NFC-[A-Za-z0-9-]{1,40}$/.test(id) || !/^[a-z0-9-]{3,70}$/.test(slug) || !label || label.length > 60 || !location || location.length > 80 || !["Active", "En pause", "À programmer"].includes(status) || !/^#[0-9a-fA-F]{6}$/.test(color)) return reply(request, 400, { error: "Configuration de carte invalide." });
      const reservedId = REVIEW_SLUGS.get(slug);
      if (reservedId && reservedId !== id) return reply(request, 409, { error: "Ce lien est déjà utilisé." });
      const current = await db().prepare("SELECT id,slug FROM demo_nfc_cards WHERE session_id=? AND id=?").bind(sessionId, id).first<{ id: string; slug: string }>();
      if (current && current.slug !== slug) return reply(request, 400, { error: "L’adresse d’une carte ne peut pas changer." });
      try {
        await db().prepare("INSERT INTO demo_nfc_cards (id,session_id,slug,label,location,status,color) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,location=excluded.location,status=excluded.status,color=excluded.color WHERE session_id=excluded.session_id").bind(id, sessionId, slug, label, location, status, color).run();
      } catch { return reply(request, 409, { error: "Ce lien est déjà utilisé." }); }
      return reply(request, 200, { data: { card: publicNfcCard({ id, slug, label, location, status, color }) } });
    }
    if (action === "nfcSettingsUpdate") {
      const threshold = input.threshold;
      const googleUrl = typeof input.googleUrl === "string" ? input.googleUrl.trim() : "";
      if (![2, 3, 4, 5].includes(threshold as number) || (googleUrl && (!/^https:\/\/(?:g\.page|maps\.app\.goo\.gl|(?:www\.)?google\.(?:com|fr)|search\.google\.com)\//.test(googleUrl) || googleUrl.length > 500))) return reply(request, 400, { error: "Paramètres NFC invalides." });
      await db().prepare("INSERT INTO demo_nfc_settings (session_id,threshold,google_url) VALUES (?,?,?) ON CONFLICT(session_id) DO UPDATE SET threshold=excluded.threshold,google_url=excluded.google_url").bind(sessionId, threshold, googleUrl).run();
      return reply(request, 200, { data: { threshold, googleUrl } });
    }
    if (action === "reviews") {
      const rows = await db().prepare("SELECT * FROM demo_reviews WHERE session_id=? ORDER BY created_at DESC LIMIT 100").bind(sessionId).all<ReviewRow>();
      const cards = await db().prepare("SELECT id,slug FROM demo_nfc_cards WHERE session_id=?").bind(sessionId).all<NfcCardRow>();
      const ids = new Map(cards.results.map((card) => [card.slug, card.id]));
      const config = await db().prepare("SELECT threshold FROM demo_nfc_settings WHERE session_id=?").bind(sessionId).first<{ threshold: number }>();
      return reply(request, 200, { data: { reviews: rows.results.map((row) => publicReview(row, config?.threshold ?? 4, ids.get(row.slug))) } });
    }
    if (action === "reviewSubmit") {
      const slug = typeof input.slug === "string" ? input.slug : "";
      const rating = input.rating;
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const comment = typeof input.comment === "string" ? input.comment.trim() : "";
      const source = input.source === 'QR' ? 'QR' : 'NFC';
      const custom = await db().prepare("SELECT id,status FROM demo_nfc_cards WHERE session_id=? AND slug=?").bind(sessionId, slug).first<NfcCardRow>();
      const cardId = custom?.id ?? REVIEW_SLUGS.get(slug);
      if (!cardId || (custom && custom.status !== 'Active') || !Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5 || name.length > 70 || comment.length > 1000) return reply(request, 400, { error: "Avis invalide ou support inactif." });
      const config = await db().prepare("SELECT threshold FROM demo_nfc_settings WHERE session_id=?").bind(sessionId).first<{ threshold: number }>();
      const status = (rating as number) < (config?.threshold ?? 4) ? 'À traiter' : 'Nouveau';
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db().prepare("INSERT INTO demo_reviews (id,session_id,slug,name,rating,comment,source,status,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, sessionId, slug, name || 'Client anonyme', rating, comment, source, status, '', now).run();
      return reply(request, 200, { data: { review: publicReview({ id, slug, name: name || 'Client anonyme', rating: rating as number, comment, source, status, note: '', created_at: now }, config?.threshold ?? 4, cardId) } });
    }
    if (action === "reviewUpdate") {
      const id = typeof input.id === "string" ? input.id : "";
      const status = typeof input.status === "string" ? input.status : "";
      const note = typeof input.note === "string" ? input.note.trim() : "";
      if (!['Nouveau', 'À traiter', 'Traité'].includes(status) || note.length > 2000) return reply(request, 400, { error: "Suivi invalide." });
      const result = await db().prepare("UPDATE demo_reviews SET status=?,note=? WHERE session_id=? AND id=?").bind(status, note, sessionId, id).run();
      if (!result.meta.changes) return reply(request, 404, { error: "Avis introuvable." });
      return reply(request, 200, { data: { updated: true } });
    }
    if (action === "create") {
      const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
      if (name.length < 2 || name.length > 70 || !name.includes(" ")) return reply(request, 400, { error: "Saisissez un prénom et un nom." });
      const [first, ...last] = name.split(" ");
      const newCode = `FDZ-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const number = `9000 ${Math.floor(1000 + Math.random() * 9000)}`;
      await db().prepare("INSERT INTO demo_members (session_id,code,first_name,last_name,member_number,status,points,initial_points,last_visit_at) VALUES (?,?,?,?,?,'Nouveau',0,0,NULL)").bind(sessionId, newCode, first, last.join(" "), number).run();
      const created = await getMember(sessionId, newCode);
      await emitAutomation(sessionId, 'Nouvelle carte ajoutée', newCode);
      return reply(request, 200, { data: { member: member(created!) } });
    }
    if (action === "undo") {
      const id = typeof input.transactionId === "string" ? input.transactionId : "";
      const row = await db().prepare("SELECT * FROM demo_transactions WHERE id=? AND session_id=? AND undone=0").bind(id, sessionId).first<TransactionRow>();
      if (!row) return reply(request, 404, { error: "Opération introuvable." });
      const last = await db().prepare("SELECT id FROM demo_transactions WHERE session_id=? AND code=? AND undone=0 ORDER BY created_at DESC LIMIT 1").bind(sessionId, row.code).first<{ id: string }>();
      if (last?.id !== id) return reply(request, 409, { error: "Annule d’abord la dernière opération de cette carte." });
      const current = await getMember(sessionId, row.code);
      if (!current || current.points !== row.previous_points + row.points) return reply(request, 409, { error: "Le solde a changé depuis cette opération." });
      await db().batch([
        db().prepare("UPDATE demo_members SET points=?,last_visit_at=NULL WHERE session_id=? AND code=?").bind(row.previous_points, sessionId, row.code),
        db().prepare("UPDATE demo_transactions SET undone=1,receipt_key=NULL WHERE id=?").bind(id),
      ]);
      const updated = await getMember(sessionId, row.code);
      return reply(request, 200, { data: { member: member(updated!) } });
    }
    const current = await getMember(sessionId, code);
    if (!current) return reply(request, 404, { error: "Cette carte n’appartient pas au programme.", code: "CARD_NOT_FOUND" });
    if (action === "lookup") return reply(request, 200, { data: { member: member(current), history: await history(sessionId, code) } });
    if (action === "adjust") {
      const points = input.points;
      if (!Number.isSafeInteger(points) || (points as number) < 0 || (points as number) > 100000) return reply(request, 400, { error: "Solde invalide." });
      const id = crypto.randomUUID();
      await db().batch([
        db().prepare("INSERT INTO demo_transactions (id,session_id,code,kind,points,previous_points,amount_cents,receipt_key,created_at,undone) VALUES (?,?,?,'adjust',?,?,NULL,NULL,?,0)").bind(id, sessionId, code, (points as number) - current.points, current.points, new Date().toISOString()),
        db().prepare("UPDATE demo_members SET points=? WHERE session_id=? AND code=?").bind(points, sessionId, code),
      ]);
      const updated = await getMember(sessionId, code);
      return reply(request, 200, { data: { member: member(updated!) } });
    }
    if (action === "earn") {
      const amount = input.amountCents;
      if (!Number.isSafeInteger(amount) || (amount as number) < 100 || (amount as number) > 500000) return reply(request, 400, { error: "Montant invalide (1 à 5 000 €)." });
      const receipt = typeof input.receipt === "string" ? input.receipt.trim().slice(0, 80) : "";
      if (receipt) {
        const duplicate = await db().prepare("SELECT id FROM demo_transactions WHERE session_id=? AND receipt_key=?").bind(sessionId, receipt).first();
        if (duplicate) return reply(request, 409, { error: "Ce ticket a déjà été crédité.", code: "RECEIPT_ALREADY_USED" });
      }
      if (current.last_visit_at && Date.now() - Date.parse(current.last_visit_at) < 120000 && input.confirmRepeat !== true) {
        return reply(request, 409, { error: "Cette carte vient d’être créditée.", code: "RECENT_SCAN" });
      }
      const gain = Math.floor((amount as number) / 100) * 10;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      try {
        await db().batch([
          db().prepare("INSERT INTO demo_transactions (id,session_id,code,kind,points,previous_points,amount_cents,receipt_key,created_at,undone) VALUES (?,?,?,?,?,?,?,?,?,0)").bind(id, sessionId, code, "earn", gain, current.points, amount, receipt || null, now),
          db().prepare("UPDATE demo_members SET points=points+?,last_visit_at=? WHERE session_id=? AND code=?").bind(gain, now, sessionId, code),
        ]);
      } catch { return reply(request, 409, { error: "Ce ticket a déjà été crédité.", code: "RECEIPT_ALREADY_USED" }); }
      const updated = await getMember(sessionId, code);
      if (current.points < 500 && updated!.points >= 500) await emitAutomation(sessionId, 'Récompense débloquée', code);
      return reply(request, 200, { data: { member: member(updated!), transaction: { id, kind: "earn", points: gain, amountCents: amount, createdAt: now } } });
    }
    if (action === "redeem") {
      if (current.points < 500) return reply(request, 409, { error: "La récompense n’est pas encore atteinte." });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const result = await db().batch([
        db().prepare("INSERT INTO demo_transactions (id,session_id,code,kind,points,previous_points,amount_cents,receipt_key,created_at,undone) SELECT ?,session_id,code,'redeem',-500,points,NULL,NULL,?,0 FROM demo_members WHERE session_id=? AND code=? AND points>=500").bind(id, now, sessionId, code),
        db().prepare("UPDATE demo_members SET points=points-500,last_visit_at=? WHERE session_id=? AND code=? AND points>=500").bind(now, sessionId, code),
      ]);
      if (!result[0].meta.changes) return reply(request, 409, { error: "Solde insuffisant." });
      const updated = await getMember(sessionId, code);
      return reply(request, 200, { data: { member: member(updated!), transaction: { id, kind: "redeem", points: -500, amountCents: null, createdAt: now }, reward: { name: RULES.rewardName, amountCents: null } } });
    }
    return reply(request, 400, { error: "Action inconnue." });
  } catch (error) {
    if (error instanceof SyntaxError) return reply(request, 400, { error: "Corps JSON invalide." });
    return reply(request, 500, { error: "Service de test indisponible." });
  }
}
