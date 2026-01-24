import fs from "node:fs/promises";
import path from "node:path";

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

const isImage = (name) => /\.(png|jpe?g|webp)$/i.test(name);
const map = {};
let renamed = 0;
let skipped = 0;

for (const folder of folders) {
  const dir = path.join(root, folder);
  const files = (await fs.readdir(dir)).filter((f) => !f.startsWith('.') && isImage(f));
  if (!files.length) {
    skipped += 1;
    continue;
  }
  files.sort();
  const first = files[0];
  const ext = path.extname(first).toLowerCase();
  const target = `${folder}${ext}`;
  if (first !== target) {
    await fs.rename(path.join(dir, first), path.join(dir, target));
    renamed += 1;
  }
  map[folder] = `/branding/school_images_edited/${folder}/${target}`;
}

const outputPath = path.resolve(cwd, "web/src/lib/schoolImages.ts");
const header = `export const SCHOOL_IMAGE_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)} as const;\n\n`;
const helpers = `export function schoolImageForSlug(slug: string): string | null {\n  return SCHOOL_IMAGE_MAP[slug] ?? null;\n}\n\nexport function slugifySchoolName(name: string): string {\n  return name\n    .toLowerCase()\n    .normalize(\"NFKD\")\n    .replace(/[^\\p{Letter}\\p{Number}]+/gu, \"-\")\n    .replace(/(^-|-$)/g, \"\");\n}\n\nexport function schoolImageForName(name: string): string | null {\n  const candidates = new Set<string>();\n  const add = (value: string) => {\n    const slug = slugifySchoolName(value);\n    if (slug) candidates.add(slug);\n  };\n\n  add(name);\n  add(name.replace(/\\s*\\(.*?\\)\\s*/g, \" \").trim());\n  add(name.split(\" - \")[0].trim());\n  add(name.split(\" – \")[0].trim());\n  add(name.replace(/&/g, \"en\"));\n\n  for (const slug of Array.from(candidates)) {\n    const stripped = slug.replace(/^(de|het|een)-/, \"\");\n    if (stripped) candidates.add(stripped);\n  }\n\n  for (const slug of candidates) {\n    const direct = schoolImageForSlug(slug);\n    if (direct) return direct;\n  }\n\n  const keys = Object.keys(SCHOOL_IMAGE_MAP);\n  for (const slug of candidates) {\n    const match = keys.find((key) => key.startsWith(slug) || slug.startsWith(key));\n    if (match) return SCHOOL_IMAGE_MAP[match] ?? null;\n  }\n\n  return null;\n}\n`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, header + helpers, "utf8");

console.log(`Folders: ${folders.length}`);
console.log(`Renamed: ${renamed}`);
console.log(`No image: ${skipped}`);
console.log(`Updated map: ${Object.keys(map).length}`);
