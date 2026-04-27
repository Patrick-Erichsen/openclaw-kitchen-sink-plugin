import { readFileSync } from "node:fs";
import path from "node:path";
import { readOpenClawSurface } from "./openclaw-surface.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const surface = readOpenClawSurface();
const hooksSource = read("src/generated-hooks.js");
const registrarsSource = read("src/generated-registrars.js");
const sdkImportsSource = read("src/generated-sdk-imports.ts");
const manifest = JSON.parse(read("openclaw.plugin.json"));

const errors = [];

for (const hook of surface.hooks) {
  if (!hooksSource.includes(`api.on("${hook}"`)) {
    errors.push(`missing hook coverage: ${hook}`);
  }
}

for (const registrar of surface.registrars) {
  if (!registrarsSource.includes(`api.${registrar}(`)) {
    errors.push(`missing registrar coverage: ${registrar}`);
  }
}

for (const specifier of surface.pluginSdkExports) {
  if (!sdkImportsSource.includes(`"${specifier}"`)) {
    errors.push(`missing SDK import coverage: ${specifier}`);
  }
}

for (const contract of surface.manifestContracts) {
  if (!Object.hasOwn(manifest.contracts ?? {}, contract)) {
    errors.push(`missing manifest contract coverage: ${contract}`);
  }
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log(
  `OpenClaw ${surface.packageVersion} surface covered: ${surface.registrars.length} registrars, ${surface.hooks.length} hooks, ${surface.manifestContracts.length} manifest contracts, ${surface.pluginSdkExports.length} SDK exports`,
);

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}
