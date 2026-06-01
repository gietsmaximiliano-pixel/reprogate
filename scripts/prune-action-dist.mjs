import { rm } from "node:fs/promises";

for (const extra of ["dist/github-action", "dist/spec", "dist/package.json"]) {
  await rm(extra, { recursive: true, force: true });
}
