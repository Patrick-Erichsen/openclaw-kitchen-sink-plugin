import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function readOpenClawSurface() {
  const packageEntryPath = require.resolve("openclaw");
  const packageRoot = findPackageRoot(packageEntryPath);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const pluginSdkExports = Object.keys(packageJson.exports ?? {})
    .filter((specifier) => specifier === "./plugin-sdk" || specifier.startsWith("./plugin-sdk/"))
    .map((specifier) => `openclaw/${specifier.slice(2)}`)
    .sort();

  const apiBuilderPath = firstExistingPath([
    path.join(packageRoot, "dist/plugin-sdk/src/plugins/api-builder.d.ts"),
    path.join(packageRoot, "src/plugins/api-builder.ts"),
  ]);
  const hookTypesPath = firstExistingPath([
    path.join(packageRoot, "dist/plugin-sdk/src/plugins/hook-types.d.ts"),
    path.join(packageRoot, "src/plugins/hook-types.ts"),
  ]);
  const manifestPath = firstExistingPath([
    path.join(packageRoot, "dist/plugin-sdk/src/plugins/manifest.d.ts"),
    path.join(packageRoot, "src/plugins/manifest.ts"),
  ]);

  const apiBuilderSource = readOptional(apiBuilderPath);
  const hookTypesSource = readOptional(hookTypesPath);
  const manifestSource = readOptional(manifestPath);

  return {
    packageJsonPath,
    packageVersion: packageJson.version,
    pluginSdkExports,
    registrars: unique([...apiBuilderSource.matchAll(/\b(register[A-Za-z0-9]+)\b/g)].map((match) => match[1])).sort(),
    hooks: parseHookNames(hookTypesSource),
    manifestContracts: parseTypeFields(manifestSource, "PluginManifestContracts"),
  };
}

function findPackageRoot(entryPath) {
  let current = path.dirname(entryPath);
  while (current !== path.dirname(current)) {
    const candidate = path.join(current, "package.json");
    if (existsSync(candidate)) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error(`Could not find openclaw package root from ${entryPath}`);
}

function firstExistingPath(paths) {
  return paths.find((item) => existsSync(item)) ?? null;
}

function readOptional(filePath) {
  return filePath ? readFileSync(filePath, "utf8") : "";
}

function parseHookNames(source) {
  const arrayMatch = source.match(/PLUGIN_HOOK_NAMES[^=]*=\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    return unique([...arrayMatch[1].matchAll(/["'`]([a-z0-9_:-]+)["'`]/g)].map((match) => match[1])).sort();
  }
  const unionMatch = source.match(/type\s+PluginHookName\s*=\s*([\s\S]*?);/);
  if (unionMatch) {
    return unique([...unionMatch[1].matchAll(/["'`]([a-z0-9_:-]+)["'`]/g)].map((match) => match[1])).sort();
  }
  return [];
}

function parseTypeFields(source, typeName) {
  const match = source.match(new RegExp(`(?:export\\s+)?(?:declare\\s+)?type\\s+${typeName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    return [];
  }
  return unique([...match[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\??\s*:/gm)].map((field) => field[1])).sort();
}

function unique(values) {
  return [...new Set(values)];
}
