import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readOpenClawSurface } from "./openclaw-surface.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const surface = readOpenClawSurface();

const generated = new Map([
  ["package.json", renderPackageJson(surface)],
  ["src/generated-hooks.js", renderHooks(surface)],
  ["src/generated-registrars.js", renderRegistrars(surface)],
  ["src/generated-sdk-imports.ts", renderSdkImports(surface)],
  ["src/index.js", renderRuntimeIndex(surface)],
  ["openclaw.plugin.json", renderManifest(surface)],
]);

const changed = [];
for (const [relativePath, content] of generated) {
  const filePath = path.join(rootDir, relativePath);
  const current = readIfExists(filePath);
  if (current !== content) {
    changed.push(relativePath);
    if (!check) {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, content, "utf8");
    }
  }
}

if (changed.length > 0 && check) {
  throw new Error(`generated OpenClaw surface files are stale:\n${changed.join("\n")}\nRun npm run sync:surface.`);
}

console.log(
  `surface ${check ? "checked" : "synced"} for openclaw ${surface.packageVersion}: ${surface.registrars.length} registrars, ${surface.hooks.length} hooks, ${surface.manifestContracts.length} manifest contracts, ${surface.pluginSdkExports.length} SDK exports`,
);

function renderHooks({ hooks, packageVersion }) {
  return `${header(packageVersion)}import { observeKitchenHook } from "./scenarios.js";

export function registerAllHooks(api) {
${hooks.map((hook) => `  api.on(${JSON.stringify(hook)}, kitchenSinkHook(${JSON.stringify(hook)}));`).join("\n")}
}

function kitchenSinkHook(name) {
  return async (event, context) => observeKitchenHook(name, event, context);
}
`;
}

function renderRegistrars({ registrars, packageVersion }) {
  return `${header(packageVersion)}
export function registerAllRegistrars(api) {
${registrars.map((registrar) => `  safeRegister("${registrar}", () => api.${registrar}(payloadFor("${registrar}")));`).join("\n")}
}

function safeRegister(name, register) {
  try {
    register();
  } catch (error) {
    apiSurfaceProbeFailures.push({ name, message: String(error?.message ?? error) });
  }
}

export const apiSurfaceProbeFailures = [];

function payloadFor(name) {
  const id = name.replace(/^register/, "").replace(/[A-Z]/g, (letter, index) => (index === 0 ? "" : "-") + letter.toLowerCase()) || "probe";
  return {
    id: "kitchen-sink-" + id,
    name: "kitchen-sink-" + id,
    description: "Kitchen-sink no-op probe for " + name + ".",
    command: "kitchen-sink-" + id,
    path: "/kitchen-sink/" + id,
    method: "POST",
    inputSchema: objectSchema(),
    schema: objectSchema(),
    configSchema: objectSchema(),
    handler: async () => ({ ok: true, registrar: name }),
    run: async () => ({ ok: true, registrar: name }),
    execute: async () => ({ ok: true, registrar: name }),
    start: async () => ({ ok: true, registrar: name }),
    stop: async () => ({ ok: true, registrar: name }),
    setup: async () => ({ ok: true, registrar: name }),
    migrate: async (value) => value,
    transform: async (value) => value,
    render: async () => "kitchen-sink memory prompt section",
    create: async () => ({ ok: true, registrar: name }),
    speak: async () => ({ audio: new Uint8Array(), mimeType: "audio/wav" }),
    synthesize: async () => ({ audio: new Uint8Array(), mimeType: "audio/wav" }),
    send: async () => ({ ok: true }),
    receive: async () => ({ ok: true }),
    probe: async () => ({ enabled: false, reason: "kitchen-sink no-op" }),
  };
}

function objectSchema() {
  return {
    type: "object",
    additionalProperties: true,
    properties: {
      input: { type: "string" },
    },
  };
}
`;
}

function renderSdkImports({ pluginSdkExports, packageVersion }) {
  return `${header(packageVersion)}${pluginSdkExports
    .map((specifier, index) => `import type * as sdk${index} from "${specifier}";`)
    .join("\n")}

export type KitchenSinkSdkImportSurface =
${pluginSdkExports.map((_, index) => `  | typeof sdk${index}`).join("\n")};
`;
}

function renderRuntimeIndex() {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
  return `import { registerAllHooks } from "./generated-hooks.js";
import { registerAllRegistrars } from "./generated-registrars.js";
import { registerKitchenSinkRuntime } from "./kitchen-runtime.js";

export const plugin = {
  id: "openclaw-kitchen-sink-fixture",
  name: "OpenClaw Kitchen Sink",
  version: "${packageJson.version}",
  description: "Credential-free fixture covering OpenClaw plugin API seams.",
  register(api) {
    registerAllHooks(api);
    registerAllRegistrars(api);
    registerKitchenSinkRuntime(api);
  },
};

export function register(api) {
  plugin.register(api);
}

export default plugin;
`;
}

function renderManifest({ manifestContracts, packageVersion }) {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const contracts = Object.fromEntries(manifestContracts.map((field) => [field, [`kitchen-sink-${kebab(field)}`]]));
  appendContract(contracts, "imageGenerationProviders", "kitchen-sink-image");
  appendContract(contracts, "mediaUnderstandingProviders", "kitchen-sink-media");
  appendContract(contracts, "webSearchProviders", "kitchen-sink-search");
  appendContract(contracts, "webFetchProviders", "kitchen-sink-fetch");
  appendContract(contracts, "tools", "kitchen_sink_image_job");
  appendContract(contracts, "tools", "kitchen_sink_text");
  appendContract(contracts, "tools", "kitchen_sink_search");
  const manifest = {
    id: "openclaw-kitchen-sink-fixture",
    name: "OpenClaw Kitchen Sink",
    version: packageJson.version,
    description: `Generated kitchen-sink fixture for OpenClaw plugin API surface ${packageVersion}.`,
    enabledByDefault: false,
    kind: ["tool", "hook", "channel", "provider"],
    channels: ["kitchen-sink-channel"],
    providers: ["kitchen-sink-provider", "kitchen-sink-llm"],
    cliBackends: ["kitchen-sink-cli-backend"],
    commandAliases: [
      { command: "kitchen", pluginId: "openclaw-kitchen-sink-fixture" },
      { command: "kitchen-sink", pluginId: "openclaw-kitchen-sink-fixture" },
    ],
    activation: {
      onProviders: ["kitchen-sink-provider", "kitchen-sink-llm", "kitchen-sink-image"],
      onChannels: ["kitchen-sink-channel"],
      onCommands: ["kitchen", "kitchen-sink"],
      onCapabilities: ["provider", "channel", "tool", "hook"],
    },
    setup: {
      providers: [
        { id: "kitchen-sink-provider", authMethods: ["none"], envVars: [] },
        { id: "kitchen-sink-llm", authMethods: ["none"], envVars: [] },
        { id: "kitchen-sink-image", authMethods: ["none"], envVars: [] },
      ],
      cliBackends: ["kitchen-sink-cli-backend"],
      configMigrations: ["kitchen-sink-config-migration"],
      requiresRuntime: false,
    },
    contracts,
    configSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean", default: false },
      },
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function renderPackageJson({ packageVersion }) {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
  packageJson.openclaw ??= {};
  packageJson.openclaw.build = {
    ...(packageJson.openclaw.build ?? {}),
    openclawVersion: packageVersion,
    pluginSdkVersion: packageVersion,
  };
  if (packageJson.dependencies?.openclaw) {
    packageJson.dependencies.openclaw = packageVersion;
  }
  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function header(packageVersion) {
  return `// Generated by scripts/sync-surface.mjs from openclaw ${packageVersion}. Do not edit by hand.\n`;
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, "");
}

function appendContract(contracts, field, id) {
  if (!Array.isArray(contracts[field])) {
    contracts[field] = [];
  }
  if (!contracts[field].includes(id)) {
    contracts[field].push(id);
  }
}

function readIfExists(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
