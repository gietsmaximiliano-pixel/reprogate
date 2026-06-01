import { rm } from "node:fs/promises";

const target = process.argv[2];
if (!target) {
  throw new Error("Usage: node scripts/clean-dist.mjs <dist-dir>");
}

await rm(target, { recursive: true, force: true });
