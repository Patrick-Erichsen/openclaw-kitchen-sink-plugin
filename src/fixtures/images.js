import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DEFAULT_IMAGE_MODEL, PLUGIN_ID } from "../constants.js";

// Use a real bundled PNG so image-provider consumers exercise binary payloads,
// data URLs, hashes, and dimensions instead of a text-only mock.
const KITCHEN_SINK_OFFICE_IMAGE_FILE = "kitchen_sink_office.png";
const KITCHEN_SINK_OFFICE_IMAGE = readFileSync(
  new URL(`../assets/${KITCHEN_SINK_OFFICE_IMAGE_FILE}`, import.meta.url),
);
const KITCHEN_SINK_OFFICE_SHA256 = sha256Hex(KITCHEN_SINK_OFFICE_IMAGE);

const KITCHEN_IMAGE_FIXTURES = [
  {
    id: "office-lobby-sink",
    label: "Kitchen Sink Office",
    assetName: KITCHEN_SINK_OFFICE_IMAGE_FILE,
    buffer: KITCHEN_SINK_OFFICE_IMAGE,
    sha256: KITCHEN_SINK_OFFICE_SHA256,
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    description: "office lobby scene with a lobster-costumed figure holding a real sink",
    source: "bundled-real-image",
  },
];

export function createKitchenSinkImageAsset({
  prompt,
  jobId,
  scenario = "image.generate",
  model = DEFAULT_IMAGE_MODEL,
}) {
  const fixture = selectKitchenImageFixture(prompt);
  const buffer = Buffer.from(fixture.buffer);
  const seed = stableHash(`${jobId}:${prompt}:${fixture.id}`);
  return {
    buffer,
    mimeType: fixture.mimeType,
    fileName: `${jobId}.png`,
    dataUrl: `data:${fixture.mimeType};base64,${buffer.toString("base64")}`,
    revisedPrompt: `Kitchen Sink office image fixture: ${prompt}`,
    metadata: {
      kitchenSink: true,
      assetId: fixture.id,
      assetName: fixture.assetName,
      source: fixture.source,
      model,
      width: fixture.width,
      height: fixture.height,
      sizeBytes: buffer.byteLength,
      sha256: fixture.sha256,
      contentHash: fixture.sha256.slice(0, 16),
      seed,
      finishReason: "success",
      pluginId: PLUGIN_ID,
      scenarioId: scenario,
      jobId,
      prompt,
    },
  };
}

function selectKitchenImageFixture(_prompt) {
  // Single fixture today, prompt-aware selection later if we add more real
  // assets for edit/upscale/multi-image scenarios.
  return KITCHEN_IMAGE_FIXTURES[0];
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
