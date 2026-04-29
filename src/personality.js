export const KITCHEN_SINK_PERSONALITIES = ["full", "conformance", "adversarial"];

export const DEFAULT_KITCHEN_SINK_PERSONALITY = "full";

export const KITCHEN_SINK_EXPECTED_DIAGNOSTICS = {
  full: [
    "only bundled plugins can register agent tool result middleware",
    'agent harness "kitchen-sink-agent-harness" registration missing required runtime methods',
    'channel "kitchen-sink-channel-probe" registration missing required config helpers',
    "cli registration missing explicit commands metadata",
    "only bundled plugins can register Codex app-server extension factories",
    'compaction provider "kitchen-sink-compaction-provider" registration missing summarize',
    "context engine registration missing id",
    "http route registration missing or invalid auth: /kitchen-sink/http-route",
    "plugin must own memory slot or declare contracts.memoryEmbeddingProviders for adapter: kitchen-sink-memory-embedding-provider",
    "memory prompt supplement registration missing builder",
  ],
  conformance: [],
  adversarial: [
    'agent harness "kitchen-sink-agent-harness" registration missing required runtime methods',
    'channel "kitchen-sink-channel-probe" registration missing required config helpers',
    "cli registration missing explicit commands metadata",
    "only bundled plugins can register Codex app-server extension factories",
    'compaction provider "kitchen-sink-compaction-provider" registration missing summarize',
    "context engine registration missing id",
    "http route registration missing or invalid auth: /kitchen-sink/http-route",
    "plugin must own memory slot or declare contracts.memoryEmbeddingProviders for adapter: kitchen-sink-memory-embedding-provider",
    "memory prompt supplement registration missing builder",
  ],
};

export function resolveKitchenSinkPersonality(api) {
  const configured = api?.config?.personality || process.env.OPENCLAW_KITCHEN_SINK_PERSONALITY;
  return KITCHEN_SINK_PERSONALITIES.includes(configured) ? configured : DEFAULT_KITCHEN_SINK_PERSONALITY;
}
