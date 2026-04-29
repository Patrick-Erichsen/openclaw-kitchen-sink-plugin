#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(path.join(tmpdir(), "kitchen-sink-install-"));
const keepTemp = process.env.KEEP_KITCHEN_INSTALL_SMOKE === "1";
let lastStdout = "";

try {
  const packDir = path.join(tempRoot, "pack");
  mkdirSync(packDir, { recursive: true });
  run("npm", ["pack", "--json", "--pack-destination", packDir], { cwd: repoRoot });
  const packOutput = JSON.parse(lastStdout);
  const tarball = path.join(packDir, packOutput[0].filename);

  const projectDir = path.join(tempRoot, "consumer");
  mkdirSync(projectDir, { recursive: true });
  run("npm", ["init", "-y"], { cwd: tempRoot });
  run("npm", ["install", "--prefix", projectDir, "--package-lock=false", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: tempRoot,
  });

  const packageDir = path.join(projectDir, "node_modules", "@openclaw", "kitchen-sink");
  const installedPackageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));
  assert.equal(installedPackageJson.name, "@openclaw/kitchen-sink");
  assert.equal(installedPackageJson.version, JSON.parse(readFileSync("package.json", "utf8")).version);

  const probeFile = path.join(projectDir, "probe.mjs");
  writeFileSync(probeFile, consumerProbeSource());
  run(process.execPath, [probeFile], { cwd: projectDir });

  const inspectorBin = path.join(repoRoot, "node_modules", ".bin", "plugin-inspector");
  run(inspectorBin, ["check", "--config", "plugin-inspector.config.json", "--no-openclaw", "--runtime", "--mock-sdk"], {
    cwd: packageDir,
    env: {
      ...process.env,
      PLUGIN_INSPECTOR_EXECUTE_ISOLATED: "1",
    },
  });

  console.log(`Installed package smoke OK: ${installedPackageJson.name}@${installedPackageJson.version}`);
} finally {
  if (!keepTemp) {
    rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept install smoke temp dir: ${tempRoot}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  lastStdout = result.stdout;
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

function consumerProbeSource() {
  return String.raw`
import assert from "node:assert/strict";
import { plugin } from "@openclaw/kitchen-sink";
import { createKitchenSinkRuntime } from "@openclaw/kitchen-sink/runtime";
import { createKitchenSinkImageAsset, kitchenPromptGuidance } from "@openclaw/kitchen-sink/scenarios";
import setup from "@openclaw/kitchen-sink/setup";

const registrations = {};
const api = new Proxy(
  { id: "consumer-install-smoke", registrationMode: "full", config: {}, logger: console },
  {
    get(target, property) {
      if (property in target) return target[property];
      if (property === "on") {
        return (...args) => {
          registrations.on ??= [];
          registrations.on.push(args);
        };
      }
      if (typeof property !== "string" || !property.startsWith("register")) return undefined;
      return (...args) => {
        registrations[property] ??= [];
        registrations[property].push(args);
      };
    },
  },
);

plugin.register(api);
assert.equal(plugin.id, "openclaw-kitchen-sink-fixture");
assert.ok(registrations.registerImageGenerationProvider?.some(([provider]) => provider.id === "kitchen-sink-image"));
assert.ok(registrations.registerProvider?.some(([provider]) => provider.id === "kitchen-sink-llm"));
assert.ok(registrations.registerWebSearchProvider?.some(([provider]) => provider.id === "kitchen-sink-search"));
assert.ok(registrations.registerChannel?.some(([channel]) => channel.id === "kitchen-sink-channel"));

const runtime = createKitchenSinkRuntime({
  delayMs: 10_000,
  sleep: async () => {},
  now: (() => {
    let tick = 0;
    return () => new Date(Date.UTC(2026, 3, 29, 12, 0, tick++));
  })(),
});
const image = await runtime.runImageJob({ prompt: "generate an image with kitchen sink" });
assert.equal(image.job.status, "completed");
assert.equal(image.image.metadata.assetName, "kitchen_sink_office.png");
assert.equal(image.image.metadata.sha256, "e126064123bb13d8ee01a22c204e079bc22397c103ed1c3a191c60d5ae3319aa");

const directImage = createKitchenSinkImageAsset({
  prompt: "consumer import smoke",
  jobId: "ks_consumer_install_smoke",
});
assert.equal(directImage.mimeType, "image/png");
assert.ok(directImage.dataUrl.startsWith("data:image/png;base64,"));
assert.ok(kitchenPromptGuidance().some((line) => line.includes("kitchen_sink_image_job")));

assert.equal(setup.id, "openclaw-kitchen-sink-setup");
assert.equal(typeof setup.setup, "function");
const setupResult = await setup.setup({ config: {} });
assert.equal(setupResult.configured, true);
`;
}
