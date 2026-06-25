import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundledDataset } from "@app/dataset";

// Serialize the curated dataset to a static JSON the Pages (static) frontend can fetch.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "frontend", "public", "dataset.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(loadBundledDataset()));
console.log(`Wrote ${out}`);
