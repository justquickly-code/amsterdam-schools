import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const cwd = process.cwd();
const imageRootCandidates = [
  path.resolve(cwd, "web/public/branding/school_images_edited"),
  path.resolve(cwd, "public/branding/school_images_edited"),
  path.resolve(cwd, "../web/public/branding/school_images_edited"),
];
let imageRoot = null;
for (const candidate of imageRootCandidates) {
  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      imageRoot = candidate;
      break;
    }
  } catch {}
}
if (!imageRoot) {
  console.error("Could not find school_images_edited folder. Tried:", imageRootCandidates);
  process.exit(1);
}

const map = new Map();
const dirEntries = await fs.readdir(imageRoot, { withFileTypes: true });
for (const dir of dirEntries) {
  if (!dir.isDirectory()) continue;
  const folder = path.join(imageRoot, dir.name);
  const files = (await fs.readdir(folder))
    .filter((f) => !f.startsWith("."))
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) continue;
  const first = files[0];
  const urlPath = `/branding/school_images_edited/${dir.name}/${first}`;
  map.set(dir.name, urlPath);
}

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

const candidatesForName = (name) => {
  const candidates = new Set();
  const add = (value) => {
    const slug = slugify(value);
    if (slug) candidates.add(slug);
  };
  add(name);
  add(name.replace(/\s*\(.*?\)\s*/g, " ").trim());
  add(name.split(" - ")[0].trim());
  add(name.split(" – ")[0].trim());
  add(name.replace(/&/g, "en"));
  for (const slug of Array.from(candidates)) {
    const stripped = slug.replace(/^(de|het|een)-/, "");
    if (stripped) candidates.add(stripped);
  }
  return Array.from(candidates);
};

const FALLBACK_IMAGE_URL = "/branding/hero/school-1.jpg";

const imageForName = (name) => {
  const alias = {
    "Amsterdams Beroepscollege Noorderlicht": "abc-noorderlicht",
    "Cartesius Lyceum": "het-cartesius",
    "Ignatiusgymnasium": "st-ignatiusgymnasium",
    "Open Schoolgemeenschap Bijlmer": "osb-amsterdam",
  };
  if (alias[name] && map.has(alias[name])) {
    return map.get(alias[name]);
  }
  const candidates = candidatesForName(name);
  for (const slug of candidates) {
    if (map.has(slug)) return map.get(slug);
  }
  for (const slug of candidates) {
    for (const key of map.keys()) {
      if (key.startsWith(slug) || slug.startsWith(key)) return map.get(key);
    }
  }
  return null;
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const { data: schools, error } = await supabase
  .from("schools")
  .select("id,name,image_url");

if (error) {
  console.error("Failed to load schools:", error.message);
  process.exit(1);
}

let updated = 0;
let matched = 0;
let skipped = 0;
const unmatched = [];
for (const school of schools ?? []) {
  const imageUrl = imageForName(school.name);
  if (!imageUrl) {
    unmatched.push(school.name);
  } else {
    matched += 1;
  }

  const nextUrl = imageUrl ?? FALLBACK_IMAGE_URL;

  if (school.image_url === nextUrl) {
    skipped += 1;
    continue;
  }

  const { error: updErr } = await supabase
    .from("schools")
    .update({ image_url: nextUrl })
    .eq("id", school.id);
  if (updErr) {
    console.error("Failed to update", school.name, updErr.message);
    continue;
  }
  updated += 1;
}

console.log(`Schools total: ${(schools ?? []).length}`);
console.log(`Already had image_url: ${skipped}`);
console.log(`Matched names: ${matched}`);
console.log(`Updated ${updated} schools with image_url.`);
if (unmatched.length) {
  console.log("Unmatched examples:");
  for (const name of unmatched.slice(0, 10)) {
    console.log(` - ${name}`);
  }
}
