import { mkdir, writeFile } from "node:fs/promises";
import { reproGateJsonSchema } from "../dist/index.js";

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../dist/schema.json", import.meta.url),
  `${JSON.stringify(reproGateJsonSchema, null, 2)}\n`
);
