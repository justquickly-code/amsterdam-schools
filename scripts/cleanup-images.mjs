import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const { data: schools, error } = await supabase.from("schools").select("name");
if (error) {
  console.error("Failed to load schools", error.message);
  process.exit(1);
}

const alias = {
  "Amsterdams Beroepscollege Noorderlicht": "abc-noorderlicht",
  "Cartesius Lyceum": "het-cartesius",
  "Ignatiusgymnasium": "st-ignatiusgymnasium",
  "Open Schoolgemeenschap Bijlmer": "osb-amsterdam",
  "De nieuwe Havo": "de-nieuwe-havo",
  "Vox College": "vox-college",
};

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

const slugs = new Set();
for (const row of schools ?? []) {
  const name = row.name || "";
  if (!name) continue;
  if (alias[name]) slugs.add(alias[name]);
  const candidates = new Set();
  const add = (value) => {
    const s = slugify(value);
    if (s) candidates.add(s);
  };

  add(name);
  add(name.replace(/\s*\(.*?\)\s*/g, " ").trim());
  add(name.split(" - ")[0].trim());
  add(name.split(" – ")[0].trim());

  for (const s of Array.from(candidates)) {
    const s2 = s.replace(/^(de|het|een)-/, "");
    if (s2) candidates.add(s2);
    if (s.includes("-voorheen-")) candidates.add(s.split("-voorheen-")[0]);
  }

  for (const s of candidates) slugs.add(s);
}

const cwd = process.cwd();
const rootCandidates = [
  path.resolve(cwd, "web/public/branding/school_images_edited"),
  path.resolve(cwd, "public/branding/school_images_edited"),
  path.resolve(cwd, "../web/public/branding/school_images_edited"),
];
let root = null;
for (const candidate of rootCandidates) {
  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      root = candidate;
      break;
    }
  } catch {}
}
if (!root) {
  console.error("Could not find school_images_edited folder. Tried:", rootCandidates);
  process.exit(1);
}
const entries = await fs.readdir(root, { withFileTypes: true });
const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name).filter((n) => !n.startsWith('.'));
const slugList = Array.from(slugs);
const unmatched = folders.filter((name) => {
  if (slugs.has(name)) return false;
  return !slugList.some((slug) => slug.startsWith(name) || name.startsWith(slug));
});

console.log(`Total folders: ${folders.length}`);
console.log(`Unmatched folders: ${unmatched.length}`);
for (const name of unmatched) {
  console.log(`- ${name}`);
}

for (const name of unmatched) {
  const folder = path.join(root, name);
  const files = await fs.readdir(folder, { withFileTypes: true });
  for (const f of files) {
    const p = path.join(folder, f.name);
    if (f.isFile()) await fs.unlink(p);
    else if (f.isDirectory()) await fs.rm(p, { recursive: true, force: true });
  }
  await fs.rmdir(folder);
}
