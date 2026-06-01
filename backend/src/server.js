// ============================================================================
//  Geurmaatje backend — Express API server
//  All endpoints are defined in this file.
//
//  PUBLIC (used by the chat widget / website)
//    GET    /                         -> health check
//    GET    /api/settings             -> bot name, teaser, welcome message
//    GET    /api/products             -> active products (catalog)
//    POST   /api/chat                 -> talk to Geurmaatje  { sessionId, message }
//    GET    /api/chat/history         -> restore chat for a sessionId
//    POST   /api/leads                -> submit a lead directly (contact form)
//
//  AUTH
//    POST   /api/auth/login           -> { email, password } -> { token }
//    GET    /api/auth/me              -> current admin (Bearer token)
//
//  ADMIN (Bearer token required)
//    GET    /api/admin/products
//    POST   /api/admin/products
//    PUT    /api/admin/products/:id
//    DELETE /api/admin/products/:id
//    GET    /api/admin/leads
//    PUT    /api/admin/leads/:id      -> update status / fields
//    DELETE /api/admin/leads/:id
//    GET    /api/admin/conversations            -> list (with message counts)
//    GET    /api/admin/conversations/:id        -> full transcript
//    DELETE /api/admin/conversations/:id
//    GET    /api/admin/settings
//    PUT    /api/admin/settings       -> { key: value, ... }
//    GET    /api/admin/analytics      -> dashboard stats
// ============================================================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import prisma from "./db.js";
import { runChat, getSettings } from "./chat.js";
import { uploadImage } from "./storage.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// In-memory upload (max 5MB) — buffer is streamed to Supabase Storage.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---- CORS -----------------------------------------------------------------
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl (no origin) and any whitelisted origin
      if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      return cb(null, true); // widget is embedded on many shops; keep permissive
    },
  })
);

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ---- Auth middleware ------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  });

function extractProductCodes(text) {
  return [...new Set((String(text).match(/No\.\s?\d{2,4}/gi) || []).map((c) => c.replace(/\s/g, "")))];
}

async function productsForReply(reply) {
  const codes = extractProductCodes(reply);
  if (!codes.length) return [];
  const products = await prisma.product.findMany({
    where: { active: true, code: { in: codes } },
  });
  products.sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));
  return products;
}

// ===========================================================================
//  HEALTH
// ===========================================================================
app.get("/", (req, res) =>
  res.json({ ok: true, service: "geurmaatje-backend", time: new Date().toISOString() })
);

// ===========================================================================
//  PUBLIC
// ===========================================================================
app.get(
  "/api/settings",
  wrap(async (req, res) => {
    const s = await getSettings();
    res.json({
      brandName: s.brandName,
      botName: s.botName,
      tagline: s.tagline,
      teaser: s.teaser,
      welcome: s.welcome,
      suggestions: String(s.suggestions || "")
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean),
      launcherIcon: s.launcherIcon || "",
      primaryColor: s.primaryColor,
      accentColor: s.accentColor,
    });
  })
);

app.get(
  "/api/products",
  wrap(async (req, res) => {
    const { category } = req.query;
    const products = await prisma.product.findMany({
      where: { active: true, ...(category ? { category: String(category) } : {}) },
      orderBy: { code: "asc" },
    });
    res.json(products);
  })
);

app.post(
  "/api/chat",
  wrap(async (req, res) => {
    const { sessionId, message, history } = req.body || {};
    if (!message || !String(message).trim())
      return res.status(400).json({ error: "message is required" });

    const sid = sessionId || `sess_${Date.now()}_${Math.round(Math.random() * 1e6)}`;

    // Find or create the conversation
    let convo = await prisma.conversation.findUnique({ where: { sessionId: sid } });
    if (!convo) convo = await prisma.conversation.create({ data: { sessionId: sid } });

    // Build history from DB (source of truth) or fall back to client-sent history
    const stored = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" },
    });
    const priorHistory = stored.length
      ? stored.map((m) => ({ role: m.role, content: m.content }))
      : Array.isArray(history)
      ? history
      : [];

    // Save the new user message
    await prisma.message.create({
      data: { conversationId: convo.id, role: "user", content: String(message) },
    });

    const result = await runChat({
      history: [...priorHistory, { role: "user", content: String(message) }],
      sessionId: sid,
    });

    // Save assistant reply
    await prisma.message.create({
      data: { conversationId: convo.id, role: "assistant", content: result.reply },
    });
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    const products = await productsForReply(result.reply);

    res.json({ sessionId: sid, reply: result.reply, leadCaptured: result.leadCaptured, products });
  })
);

app.get(
  "/api/chat/history",
  wrap(async (req, res) => {
    const sid = String(req.query.sessionId || "");
    if (!sid) return res.status(400).json({ error: "sessionId required" });

    const convo = await prisma.conversation.findUnique({
      where: { sessionId: sid },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!convo) return res.json({ sessionId: sid, messages: [] });

    const messages = await Promise.all(
      convo.messages.map(async (m) => {
        const msg = { role: m.role, content: m.content };
        if (m.role === "assistant") msg.products = await productsForReply(m.content);
        return msg;
      })
    );

    res.json({ sessionId: sid, messages });
  })
);

app.post(
  "/api/leads",
  wrap(async (req, res) => {
    const { name, email, phone, message, interest, sessionId } = req.body || {};
    const lead = await prisma.lead.create({
      data: { name, email, phone, message, interest, sessionId },
    });
    res.status(201).json(lead);
  })
);

// ===========================================================================
//  AUTH
// ===========================================================================
app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await prisma.adminUser.findUnique({ where: { email: String(email || "") } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(String(password || ""), user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  })
);

app.get(
  "/api/auth/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
    res.json({ id: user.id, email: user.email, name: user.name });
  })
);

// ===========================================================================
//  ADMIN — PRODUCTS
// ===========================================================================
app.get(
  "/api/admin/products",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await prisma.product.findMany({ orderBy: { code: "asc" } }));
  })
);

const PRODUCT_FIELDS = [
  "code", "name", "category", "gender", "inspiredBy", "inspiredBrand", "realName", "type",
  "intensity", "season", "occasions", "notes", "description",
  "priceRegular", "priceSale", "content", "imageUrl", "images", "url", "active",
];
function pickProduct(body) {
  const data = {};
  for (const f of PRODUCT_FIELDS) if (body[f] !== undefined) data[f] = body[f];
  if (data.priceRegular != null) data.priceRegular = Number(data.priceRegular);
  if (data.priceSale != null) data.priceSale = Number(data.priceSale);
  if (data.images !== undefined) data.images = Array.isArray(data.images) ? data.images.slice(0, 4) : [];
  return data;
}

// Upload a single perfume photo to Supabase Storage -> returns its public URL.
app.post(
  "/api/admin/upload",
  requireAuth,
  upload.single("file"),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Geen bestand ontvangen" });
    const { url, path } = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url, path });
  })
);

app.post(
  "/api/admin/products",
  requireAuth,
  wrap(async (req, res) => {
    const data = pickProduct(req.body || {});
    if (!data.code || !data.name || !data.category || !data.inspiredBy)
      return res.status(400).json({ error: "code, name, category, inspiredBy are required" });
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  })
);

app.put(
  "/api/admin/products/:id",
  requireAuth,
  wrap(async (req, res) => {
    const data = pickProduct(req.body || {});
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  })
);

app.delete(
  "/api/admin/products/:id",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ===========================================================================
//  ADMIN — LEADS
// ===========================================================================
app.get(
  "/api/admin/leads",
  requireAuth,
  wrap(async (req, res) => {
    res.json(await prisma.lead.findMany({ orderBy: { createdAt: "desc" } }));
  })
);

app.put(
  "/api/admin/leads/:id",
  requireAuth,
  wrap(async (req, res) => {
    const { name, email, phone, message, interest, status } = req.body || {};
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { name, email, phone, message, interest, status },
    });
    res.json(lead);
  })
);

app.delete(
  "/api/admin/leads/:id",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ===========================================================================
//  ADMIN — CONVERSATIONS
// ===========================================================================
app.get(
  "/api/admin/conversations",
  requireAuth,
  wrap(async (req, res) => {
    const convos = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    res.json(convos);
  })
);

app.get(
  "/api/admin/conversations/:id",
  requireAuth,
  wrap(async (req, res) => {
    const convo = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!convo) return res.status(404).json({ error: "Not found" });
    res.json(convo);
  })
);

app.delete(
  "/api/admin/conversations/:id",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.conversation.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ===========================================================================
//  ADMIN — SETTINGS
// ===========================================================================
app.get(
  "/api/admin/settings",
  requireAuth,
  wrap(async (req, res) => {
    const rows = await prisma.setting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  })
);

app.put(
  "/api/admin/settings",
  requireAuth,
  wrap(async (req, res) => {
    const entries = Object.entries(req.body || {});
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        })
      )
    );
    const rows = await prisma.setting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  })
);

// ===========================================================================
//  ADMIN — ANALYTICS
// ===========================================================================
app.get(
  "/api/admin/analytics",
  requireAuth,
  wrap(async (req, res) => {
    const [productCount, activeProducts, leadCount, newLeads, convoCount, msgCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { active: true } }),
        prisma.lead.count(),
        prisma.lead.count({ where: { status: "new" } }),
        prisma.conversation.count(),
        prisma.message.count(),
      ]);

    const leadsByStatus = await prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    // Most-requested products (by lead interest)
    const interests = await prisma.lead.groupBy({
      by: ["interest"],
      where: { interest: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { interest: "desc" } },
      take: 5,
    });

    const recentLeads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({
      products: { total: productCount, active: activeProducts },
      leads: { total: leadCount, new: newLeads, byStatus: leadsByStatus },
      conversations: { total: convoCount, messages: msgCount },
      topInterests: interests,
      recentLeads,
    });
  })
);

// ---- Start ----------------------------------------------------------------
// On Vercel the app is invoked as a serverless handler (see api/index.js),
// so we only bind a port when running locally / on a normal Node host.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🌸 Geurmaatje backend running on http://localhost:${PORT}`);
    if (allowed.length) console.log(`   CORS allowed: ${allowed.join(", ")}`);
  });
}

export default app;
