// Supabase Storage helper — uploads perfume photos to a public bucket and
// returns their public URLs. Uses the secret (service) key, server-side only.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "product-images";

let _client = null;
function client() {
  if (!URL || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY niet ingesteld");
  if (!_client) _client = createClient(URL, KEY, { auth: { persistSession: false } });
  return _client;
}

let _bucketReady = false;
async function ensureBucket() {
  if (_bucketReady) return;
  const sb = client();
  // createBucket is idempotent-ish: ignore "already exists" errors.
  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  });
  if (error && !/already exists/i.test(error.message || "")) {
    // Bucket may already exist (created in dashboard) — verify by listing.
    const { error: listErr } = await sb.storage.from(BUCKET).list("", { limit: 1 });
    if (listErr) throw error;
  }
  _bucketReady = true;
}

const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9._-]/g, "_");

// Uploads a Buffer and returns its public URL.
export async function uploadImage(buffer, originalName, mimetype) {
  await ensureBucket();
  const sb = client();
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe(
    originalName.replace(/\.[^.]+$/, "")
  ).slice(0, 40)}.${ext}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimetype,
    upsert: false,
  });
  if (error) throw new Error("Upload mislukt: " + error.message);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export { BUCKET };
