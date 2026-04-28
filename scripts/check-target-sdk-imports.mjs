#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { readOpenClawSurface } from "./openclaw-surface.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const generatedSdkImports = readFileSync(path.join(rootDir, "src/generated-sdk-imports.ts"), "utf8");
const importedSdkSpecifiers = [
  ...generatedSdkImports.matchAll(/from\s+["'](openclaw\/plugin-sdk(?:\/[^"']+)?)["']/g),
].map((match) => match[1]);
const targetSurface = readOpenClawSurface();
const targetSdkExports = new Set(targetSurface.pluginSdkExports);
const importsMissingFromTarget = importedSdkSpecifiers.filter((specifier) => !targetSdkExports.has(specifier));

if (importsMissingFromTarget.length > 0) {
  throw new Error(
    `generated SDK imports missing from target OpenClaw ${targetSurface.packageVersion} exports:\n${importsMissingFromTarget.join("\n")}`,
  );
}

console.log(
  `Generated SDK imports are valid for OpenClaw ${targetSurface.packageVersion}: ${importedSdkSpecifiers.length} imports, ${targetSurface.pluginSdkExports.length} target exports`,
);
