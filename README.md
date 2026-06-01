# Geurmaatje — AI Perfume Chatbot for Geurbar

An end-to-end AI fragrance advisor + admin dashboard for **geurbar.com** (and reusable for any perfume shop). Built around three independent apps:

```
geurbar-chatbot/
├── backend/   Node + Express + Prisma + Supabase (PostgreSQL) + OpenAI   → REST API + chat engine
├── client/    React (Vite)                                               → elegant chat widget (what visitors use)
└── admin/     React (Vite)                                               → dashboard (products, leads, chats, settings)
```

## What it does
- **Recommends by preference** ("sweet & long-lasting for the evening") from the live catalog.
- **Dupe-matching**: customer names a brand the shop doesn't sell ("Gucci Bloom") → suggests the closest in-house match.
- **Multilingual** — replies in the customer's language automatically (NL/EN/DE/FR/ES/…).
- **Charming, on-brand personality** with tasteful compliments — and **strictly on-topic** (politely refuses anything unrelated to the shop/fragrances).
- **Captures leads** automatically (name/email/interest) into the dashboard.
- **Fully generalized** — brand name, tone, knowledge base (shipping/returns/prices) and catalog all come from the database, editable in the admin. Nothing hardcoded.

---

## 1. Backend

```bash
cd backend
npm install
# .env already contains Supabase + OpenAI keys
npm run setup     # prisma generate + db push + seed (47 products, settings, admin user)
npm run dev       # http://localhost:4000   (or: npm start)
```

Default admin login (created by the seed): **admin@geurbar.nl** / **geurbar123**

### Endpoints (all in `src/server.js`)
Public: `GET /api/settings`, `GET /api/products`, `POST /api/chat`, `POST /api/leads`
Auth: `POST /api/auth/login`, `GET /api/auth/me`
Admin (Bearer token): products CRUD, leads, conversations, settings, `GET /api/admin/analytics`

## 2. Client (chat)

```bash
cd client
npm install
npm run dev       # http://localhost:5173
```
`.env` → `VITE_API_URL=http://localhost:4000`

## 3. Admin (dashboard)

```bash
cd admin
npm install
npm run dev       # http://localhost:5174
```
`.env` → `VITE_API_URL=http://localhost:4000`

---

## Shopify integration (later)
The client app is built with `npm run build` (outputs `client/dist`). It can be hosted (e.g. Vercel) and embedded in the Shopify theme as a floating widget / iframe pointed at the deployed backend. The bot name, teaser bubble ("Klaar om een geurtje te kiezen? 😊"), colors and personality are all controlled from the admin **Instellingen** page.

## Notes
- Database: Supabase PostgreSQL (free tier, automatic backups). Connection via the IPv4 pooler.
- Monthly cost = OpenAI usage only (model `gpt-4o-mini`, ~$5–10/mo for typical traffic).
