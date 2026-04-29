import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const PLUGIN_ID = "openclaw-kitchen-sink-fixture";
export const IMAGE_PROVIDER_ID = "kitchen-sink-image";
export const MEDIA_PROVIDER_ID = "kitchen-sink-media";
export const TEXT_PROVIDER_ID = "kitchen-sink-llm";
export const WEB_SEARCH_PROVIDER_ID = "kitchen-sink-search";
export const WEB_FETCH_PROVIDER_ID = "kitchen-sink-fetch";
export const SPEECH_PROVIDER_ID = "kitchen-sink-speech";
export const REALTIME_TRANSCRIPTION_PROVIDER_ID = "kitchen-sink-realtime-transcription";
export const REALTIME_VOICE_PROVIDER_ID = "kitchen-sink-realtime-voice";
export const VIDEO_PROVIDER_ID = "kitchen-sink-video";
export const MUSIC_PROVIDER_ID = "kitchen-sink-music";
export const MEMORY_EMBEDDING_PROVIDER_ID = "kitchen-sink-memory-embedding";
export const COMPACTION_PROVIDER_ID = "kitchen-sink-compaction";
export const CHANNEL_ID = "kitchen-sink-channel";
export const CHANNEL_ACCOUNT_ID = "local";
export const DEFAULT_IMAGE_MODEL = "kitchen-sink-image-v1";
export const DEFAULT_MEDIA_MODEL = "kitchen-sink-vision-v1";
export const DEFAULT_TEXT_MODEL = "kitchen-sink-text-v1";
export const DEFAULT_SPEECH_MODEL = "kitchen-sink-tts-v1";
export const DEFAULT_VIDEO_MODEL = "kitchen-sink-video-v1";
export const DEFAULT_MUSIC_MODEL = "kitchen-sink-music-v1";
export const DEFAULT_EMBEDDING_MODEL = "kitchen-sink-embed-v1";
export const DEFAULT_IMAGE_DELAY_MS = 10_000;
const KITCHEN_SINK_OFFICE_IMAGE_FILE = "kitchen_sink_office.png";
const KITCHEN_SINK_OFFICE_IMAGE = readFileSync(
  new URL(`./assets/${KITCHEN_SINK_OFFICE_IMAGE_FILE}`, import.meta.url),
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

export function createKitchenScenarioRuntime(options = {}) {
  const runtime = {
    delayMs: normalizeDelayMs(options.delayMs),
    sleep: typeof options.sleep === "function" ? options.sleep : defaultSleep,
    now: typeof options.now === "function" ? options.now : () => new Date(),
    async runScenario(request = {}) {
      return runKitchenScenario(runtime, request);
    },
    async runImageJob(input = {}) {
      return runKitchenScenario(runtime, {
        scenario: "image.generate",
        prompt: input.prompt,
        route: input.route,
      });
    },
    async runTextJob(input = {}) {
      return runKitchenScenario(runtime, {
        scenario: "text.reply",
        prompt: input.prompt,
        route: input.route,
      });
    },
  };

  return runtime;
}

export async function runKitchenScenario(runtime, request = {}) {
  const scenario = normalizeScenario(request.scenario);
  if (scenario === "image.generate") {
    const prompt = normalizePrompt(request.prompt, "a kitchen sink fixture image");
    const queuedJob = createKitchenJob("image", prompt, runtime.now(), runtime.delayMs, scenario, request.route);
    const runningJob = transitionKitchenJob(queuedJob, "running", runtime.now(), {
      progressPercent: 50,
      progressSummary: "Kitchen Sink image provider accepted the request.",
    });
    await runtime.sleep(runtime.delayMs);
    const failure = classifyKitchenFailure(prompt);
    if (failure) {
      return {
        scenarioId: scenario,
        route: request.route || "provider:image",
        job: transitionKitchenJob(runningJob, "failed", runtime.now(), {
          error: failure,
          progressPercent: 100,
          progressSummary: failure.message,
        }),
        error: failure,
      };
    }
    const image = createKitchenSinkImageAsset({
      prompt,
      jobId: queuedJob.id,
      scenario,
      model: request.model || DEFAULT_IMAGE_MODEL,
    });
    const completedAt = runtime.now();
    const completedJob = transitionKitchenJob(runningJob, "completed", completedAt, {
      completedAt: completedAt.toISOString(),
      progressPercent: 100,
      progressSummary: `Returned bundled ${image.metadata.assetName}.`,
      output: {
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.metadata.sizeBytes,
        contentHash: image.metadata.contentHash,
      },
    });
    return {
      scenarioId: scenario,
      route: request.route || "provider:image",
      job: completedJob,
      image,
    };
  }

  if (scenario === "web.search") {
    return {
      scenarioId: scenario,
      route: request.route || "provider:web-search",
      ...(await runKitchenSearch(request.query ?? request.prompt)),
    };
  }

  if (scenario === "web.fetch") {
    return {
      scenarioId: scenario,
      route: request.route || "provider:web-fetch",
      ...(await runKitchenFetch(request.url ?? request.query ?? request.prompt)),
    };
  }

  if (scenario === "image.describe") {
    const count = typeof request.count === "number" ? request.count : 1;
    return {
      scenarioId: scenario,
      route: request.route || "provider:media-understanding",
      text: kitchenImageDescription(request.prompt, count),
      model: request.model || DEFAULT_MEDIA_MODEL,
    };
  }

  const prompt = normalizePrompt(request.prompt, "explain the kitchen sink fixture");
  const job = createKitchenJob("text", prompt, runtime.now(), 0, scenario, request.route);
  const text = kitchenTextResponse(prompt);
  const completedAt = runtime.now();
  return {
    scenarioId: "text.reply",
    route: request.route || "provider:text",
    job: transitionKitchenJob(job, "completed", completedAt, {
      completedAt: completedAt.toISOString(),
      progressPercent: 100,
      progressSummary: "Kitchen Sink text provider produced a deterministic reply.",
    }),
    text,
    usage: estimateUsage(prompt, text),
  };
}

export function createKitchenSinkImageAsset({ prompt, jobId, scenario = "image.generate", model = DEFAULT_IMAGE_MODEL }) {
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

export function shouldHandleKitchenText(text) {
  return /^kitchen(?:\s|$)/i.test(String(text ?? "").trim());
}

export function kitchenPromptGuidance() {
  return [
    "Kitchen Sink fixture plugin:",
    "- Use the kitchen_sink_image_job tool when the user asks for a kitchen sink image without selecting an image provider.",
    "- Use provider kitchen-sink-image for image generation when the configured image provider is Kitchen Sink.",
    "- Image prompts containing rate limit, timeout, or fail trigger deterministic failure paths for retry/error handling.",
    "- Use kitchen_sink_search for deterministic search fixture queries.",
    "- Use kitchen_sink_text for deterministic text fixture responses.",
  ];
}

export function createKitchenChannelDelivery({ kind = "text", text = "", to = "kitchen" }) {
  const normalizedTo = normalizeKitchenTarget(to);
  const id = `ks_channel_${stableHash(`${kind}:${normalizedTo}:${text}`).slice(0, 10)}`;
  return {
    channel: CHANNEL_ID,
    messageId: id,
    conversationId: normalizedTo,
    channelId: normalizedTo,
    timestamp: Date.now(),
    deliveryStatus: "sent",
    transport: "kitchen-sink-local",
    meta: {
      kitchenSink: true,
      pluginId: PLUGIN_ID,
      scenarioId: inferKitchenScenario({ text }),
      kind,
    },
  };
}

export function kitchenChannelAccount(accountId = CHANNEL_ACCOUNT_ID, config = {}) {
  const normalizedAccountId = accountId || CHANNEL_ACCOUNT_ID;
  const enabled = normalizedAccountId !== "disabled" && config?.disabled !== true;
  const configured = normalizedAccountId !== "missing" && config?.configured !== false;
  const ok = enabled && configured;
  return {
    accountId: normalizedAccountId,
    name: normalizedAccountId === CHANNEL_ACCOUNT_ID ? "Kitchen Sink Local" : `Kitchen Sink ${normalizedAccountId}`,
    enabled,
    configured,
    statusState: ok ? "ready" : enabled ? "needs_setup" : "disabled",
    linked: configured,
    running: ok,
    connected: ok,
    mode: "local",
    health: {
      ok,
      checkedAt: "2026-04-28T00:00:00.000Z",
      message: ok
        ? "Kitchen Sink local fixture account is ready."
        : "Kitchen Sink local fixture account is intentionally unavailable.",
    },
    capabilities: ["text", "media", "threads", "dry-run"],
  };
}

export function normalizeKitchenTarget(raw) {
  return String(raw ?? "").replace(/^kitchen:/i, "").replace(/\s+/g, "-").trim() || "kitchen";
}

export async function runKitchenCommand(runtime, args) {
  const phrase = String(args ?? "").trim();
  if (/\b(image|picture|draw|generate)\b/i.test(phrase)) {
    const result = await runtime.runScenario({
      scenario: "image.generate",
      prompt: phrase || "kitchen sink image",
      route: "prefix:kitchen",
    });
    return kitchenImageReply(result);
  }
  if (/\b(search|find|lookup|web)\b/i.test(phrase)) {
    const result = await runtime.runScenario({
      scenario: "web.search",
      query: phrase,
      route: "prefix:kitchen",
    });
    return { text: renderSearchText(result), channelData: { kitchenSink: result } };
  }
  const result = await runtime.runScenario({
    scenario: "text.reply",
    prompt: phrase || "kitchen status",
    route: "prefix:kitchen",
  });
  return {
    text: result.text,
    channelData: { kitchenSink: result },
  };
}

export async function runKitchenImageTool(runtime, input) {
  const result = await runtime.runScenario({
    scenario: "image.generate",
    prompt: readPrompt(input),
    route: "tool:kitchen_sink_image_job",
  });
  if (result.error) {
    return {
      ...result,
      ok: false,
    };
  }
  return {
    ...result,
    ok: true,
    mediaUrl: result.image.dataUrl,
  };
}

export async function runKitchenSearch(query) {
  const normalized = normalizePrompt(query, "kitchen sink");
  const requestId = `ks_search_${stableHash(normalized).slice(0, 10)}`;
  const failure = classifyKitchenFailure(normalized);
  if (failure) {
    return {
      provider: WEB_SEARCH_PROVIDER_ID,
      requestId,
      query: normalized,
      ok: false,
      statusCode: failure.statusCode,
      latencyMs: 12,
      error: failure,
      results: [],
    };
  }
  if (/\b(empty|no results|zero)\b/i.test(normalized)) {
    return {
      provider: WEB_SEARCH_PROVIDER_ID,
      requestId,
      query: normalized,
      ok: true,
      statusCode: 200,
      latencyMs: 18,
      results: [],
      answer: "No Kitchen Sink fixture results matched the deterministic empty-result query.",
    };
  }
  return {
    provider: WEB_SEARCH_PROVIDER_ID,
    requestId,
    query: normalized,
    ok: true,
    statusCode: 200,
    latencyMs: 24,
    answer: `Kitchen Sink found fixture routes for "${normalized}".`,
    results: [
      {
        id: "ks-result-image-provider",
        title: "Kitchen Sink image fixture",
        url: "https://github.com/openclaw/kitchen-sink#image-fixture",
        displayUrl: "github.com/openclaw/kitchen-sink#image-fixture",
        snippet: `Deterministic image job route for "${normalized}".`,
        source: "kitchen-sink-docs",
        score: 0.98,
        faviconUrl: "https://github.githubassets.com/favicons/favicon.svg",
        metadata: { route: "provider:image", provider: IMAGE_PROVIDER_ID },
      },
      {
        id: "ks-result-dry-command",
        title: "Kitchen Sink dry command route",
        url: "https://github.com/openclaw/kitchen-sink#dry-command-route",
        displayUrl: "github.com/openclaw/kitchen-sink#dry-command-route",
        snippet: "The kitchen prefix works without live LLM credentials.",
        source: "kitchen-sink-docs",
        score: 0.91,
        faviconUrl: "https://github.githubassets.com/favicons/favicon.svg",
        metadata: { route: "prefix:kitchen", provider: "command" },
      },
      {
        id: "ks-result-provider-route",
        title: "Kitchen Sink provider route",
        url: "https://github.com/openclaw/kitchen-sink#provider-route",
        displayUrl: "github.com/openclaw/kitchen-sink#provider-route",
        snippet: "The image, media, text, fetch, and search providers are registered by the plugin.",
        source: "kitchen-sink-docs",
        score: 0.87,
        faviconUrl: "https://github.githubassets.com/favicons/favicon.svg",
        metadata: { route: "provider:*", provider: PLUGIN_ID },
      },
    ],
  };
}

export async function runKitchenFetch(url) {
  const target = normalizePrompt(url, "kitchen://fixture/readme");
  const failure = classifyKitchenFailure(target);
  const finalUrl = /\bredirect\b/i.test(target) ? "kitchen://fixture/readme" : target;
  const missing = /\b(404|missing|not found)\b/i.test(target);
  const statusCode = failure?.statusCode || (missing ? 404 : 200);
  const ok = statusCode >= 200 && statusCode < 400;
  const title = failure
    ? "Kitchen Sink fixture error"
    : missing
      ? "Kitchen Sink fixture not found"
      : "Kitchen Sink fixture document";
  const content = ok
    ? `Kitchen Sink fetched "${finalUrl}". This deterministic document proves plugin web-fetch routing without network access.`
    : `Kitchen Sink could not fetch "${target}" in the deterministic fixture corpus.`;
  return {
    provider: WEB_FETCH_PROVIDER_ID,
    requestId: `ks_fetch_${stableHash(target).slice(0, 10)}`,
    ok,
    statusCode,
    url: target,
    finalUrl,
    title,
    contentType: "text/markdown; charset=utf-8",
    headers: {
      "cache-control": "max-age=3600",
      "content-type": "text/markdown; charset=utf-8",
      "x-kitchen-sink-fixture": "true",
    },
    redirects: finalUrl === target ? [] : [{ statusCode: 302, from: target, to: finalUrl }],
    cache: { status: "HIT", maxAgeSeconds: 3600 },
    links: [
      { href: "kitchen://fixture/image-provider", text: "Image provider fixture" },
      { href: "kitchen://fixture/search", text: "Search fixture" },
    ],
    markdown: `# ${title}\n\n${content}\n`,
    content,
    ...(ok ? {} : { error: failure || { code: "not_found", message: "Fixture document was not found.", retryable: false } }),
  };
}

export function createKitchenSpeechAsset({ text, voice = "kitchen-neutral", model = DEFAULT_SPEECH_MODEL } = {}) {
  const normalized = normalizePrompt(text, "Kitchen Sink speech fixture.");
  const audioBuffer = createKitchenWavBuffer(normalized);
  return {
    audioBuffer,
    buffer: audioBuffer,
    mimeType: "audio/wav",
    outputFormat: "wav",
    fileExtension: ".wav",
    voice,
    voiceCompatible: true,
    model,
    durationMs: 480,
    sampleRateHz: 16_000,
    text: normalized,
    metadata: fixtureMetadata("speech.synthesize", SPEECH_PROVIDER_ID, {
      model,
      voice,
      sizeBytes: audioBuffer.byteLength,
      sha256: sha256Hex(audioBuffer),
    }),
  };
}

export function createKitchenTranscription({ audio, prompt } = {}) {
  const byteLength = inferByteLength(audio);
  return {
    provider: REALTIME_TRANSCRIPTION_PROVIDER_ID,
    scenarioId: "media.audio-transcribe",
    text: `Kitchen Sink transcript for ${byteLength} bytes of audio. ${normalizePrompt(prompt, "No prompt supplied.")}`,
    language: "en",
    segments: [
      { startMs: 0, endMs: 240, text: "Kitchen Sink transcript." },
      { startMs: 240, endMs: 480, text: "Deterministic audio fixture complete." },
    ],
    confidence: 0.99,
    metadata: fixtureMetadata("media.audio-transcribe", REALTIME_TRANSCRIPTION_PROVIDER_ID, { byteLength }),
  };
}

export function createKitchenVideoResult({ prompt, model = DEFAULT_VIDEO_MODEL } = {}) {
  const normalized = normalizePrompt(prompt, "kitchen sink video fixture");
  const id = `ks_video_${stableHash(normalized).slice(0, 10)}`;
  return {
    provider: VIDEO_PROVIDER_ID,
    model,
    job: mediaJob("video", id, normalized, "video.generate"),
    videos: [
      {
        id,
        mimeType: "application/vnd.openclaw.kitchen-video+json",
        fileName: `${id}.kitchen-video.json`,
        durationMs: 3_000,
        width: 1024,
        height: 1024,
        dataUrl: dataUrlForJson("application/vnd.openclaw.kitchen-video+json", {
          id,
          prompt: normalized,
          frames: ["office-lobby-sink", "sink-closeup", "fixture-badge"],
        }),
        metadata: fixtureMetadata("video.generate", VIDEO_PROVIDER_ID, { model, prompt: normalized }),
      },
    ],
    metadata: fixtureMetadata("video.generate", VIDEO_PROVIDER_ID, { model, jobId: id }),
  };
}

export function createKitchenMusicResult({ prompt, model = DEFAULT_MUSIC_MODEL } = {}) {
  const normalized = normalizePrompt(prompt, "kitchen sink music fixture");
  const id = `ks_music_${stableHash(normalized).slice(0, 10)}`;
  const audioBuffer = createKitchenWavBuffer(normalized);
  return {
    provider: MUSIC_PROVIDER_ID,
    model,
    job: mediaJob("music", id, normalized, "music.generate"),
    tracks: [
      {
        id,
        title: "Kitchen Sink Fixture Loop",
        mimeType: "audio/wav",
        fileName: `${id}.wav`,
        durationMs: 480,
        audioBuffer,
        dataUrl: `data:audio/wav;base64,${audioBuffer.toString("base64")}`,
        metadata: fixtureMetadata("music.generate", MUSIC_PROVIDER_ID, {
          model,
          sizeBytes: audioBuffer.byteLength,
          sha256: sha256Hex(audioBuffer),
        }),
      },
    ],
    metadata: fixtureMetadata("music.generate", MUSIC_PROVIDER_ID, { model, jobId: id }),
  };
}

export function createKitchenEmbedding(input, dimensions = 8) {
  const text = Array.isArray(input) ? input.join("\n") : normalizePrompt(input, "kitchen sink memory");
  const hash = createHash("sha256").update(text).digest();
  return Array.from({ length: dimensions }, (_, index) => Number(((hash[index] / 255) * 2 - 1).toFixed(6)));
}

export function createKitchenMemorySearch(query) {
  const normalized = normalizePrompt(query, "kitchen sink memory");
  return {
    provider: MEMORY_EMBEDDING_PROVIDER_ID,
    scenarioId: "memory.search",
    query: normalized,
    results: [
      {
        id: "ks-memory-runtime-surfaces",
        score: 0.97,
        title: "Kitchen Sink runtime surfaces",
        text: "Kitchen Sink exercises providers, tools, hooks, channels, memory, compaction, and task lifecycles.",
        metadata: fixtureMetadata("memory.search", MEMORY_EMBEDDING_PROVIDER_ID),
      },
    ],
  };
}

export function createKitchenCompaction(input = {}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const text = messages
    .map((message) => (typeof message?.content === "string" ? message.content : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  const summary = normalizePrompt(text, normalizePrompt(input.text, "Kitchen Sink compacted deterministic transcript."));
  return {
    provider: COMPACTION_PROVIDER_ID,
    scenarioId: "compaction.summary",
    summary: `Kitchen Sink compacted ${messages.length || 1} turn${messages.length === 1 ? "" : "s"}: ${summary.slice(0, 180)}`,
    preservedIdentifiers: [...new Set(summary.match(/\bks_[a-z]+_[a-f0-9]+\b/g) || [])],
    metadata: fixtureMetadata("compaction.summary", COMPACTION_PROVIDER_ID, { messageCount: messages.length }),
  };
}

export function kitchenImageReply(result) {
  if (result.error) {
    return {
      text: `kitchen image job ${result.job.id} failed: ${result.error.message}`,
      presentation: {
        title: "Kitchen Sink Image Failed",
        tone: "danger",
        blocks: [
          { type: "text", text: `job: ${result.job.id}` },
          { type: "context", text: `code=${result.error.code} retryable=${String(result.error.retryable)}` },
        ],
      },
      channelData: {
        kitchenSink: result,
      },
    };
  }
  return {
    text:
      `kitchen image job ${result.job.id} completed after ${Math.round(result.job.delayMs / 1000)}s. ` +
      `provider=${IMAGE_PROVIDER_ID} model=${result.image.metadata.model} asset=${result.image.metadata.assetName}`,
    mediaUrl: result.image.dataUrl,
    presentation: {
      title: "Kitchen Sink Image",
      tone: "success",
      blocks: [
        { type: "text", text: `job: ${result.job.id}` },
        { type: "text", text: `asset: ${result.image.metadata.assetName}` },
        { type: "context", text: result.image.revisedPrompt },
      ],
    },
    channelData: {
      kitchenSink: result,
    },
  };
}

export function kitchenTextProviderConfig() {
  return {
    baseUrl: "kitchen-sink://local",
    apiKey: "kitchen-sink-local-fixture",
    auth: "token",
    api: "kitchen-sink",
    models: [kitchenTextModelDefinition()],
  };
}

export function kitchenTextModelDefinition() {
  return {
    id: DEFAULT_TEXT_MODEL,
    name: "Kitchen Sink Text Fixture",
    api: "kitchen-sink",
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 2048,
    description: "Deterministic OpenClaw plugin text-provider fixture.",
  };
}

export function createKitchenTextStream(model, context) {
  const stream = createAssistantMessageEventStream();
  queueMicrotask(() => {
    const prompt = extractLastUserPrompt(context);
    const text = kitchenTextResponse(prompt);
    const message = {
      role: "assistant",
      content: [{ type: "text", text }],
      api: model?.api || "kitchen-sink",
      provider: TEXT_PROVIDER_ID,
      model: model?.id || DEFAULT_TEXT_MODEL,
      usage: estimateUsage(prompt, text),
      stopReason: "stop",
      timestamp: Date.now(),
    };
    stream.push({ type: "start", partial: { ...message, content: [] } });
    stream.push({ type: "text_start", contentIndex: 0, partial: { ...message, content: [] } });
    stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial: message });
    stream.push({ type: "text_end", contentIndex: 0, content: text, partial: message });
    stream.push({ type: "done", reason: "stop", message });
    stream.end(message);
  });
  return stream;
}

export function kitchenTextResponse(prompt) {
  const normalized = normalizePrompt(prompt, "kitchen sink text inference");
  if (/\b(image|picture|draw|generate)\b/i.test(normalized)) {
    return [
      "Kitchen Sink text fixture:",
      `prompt="${normalized}"`,
      `I would route this to ${IMAGE_PROVIDER_ID}/${DEFAULT_IMAGE_MODEL}, create a queued image job, wait for completion, then return the bundled kitchen_sink_office.png asset with PNG metadata.`,
    ].join(" ");
  }
  if (/\b(search|find|lookup|web)\b/i.test(normalized)) {
    return [
      "Kitchen Sink text fixture:",
      `prompt="${normalized}"`,
      `I would call ${WEB_SEARCH_PROVIDER_ID} for ranked fixture results and ${WEB_FETCH_PROVIDER_ID} for deterministic document fetches.`,
    ].join(" ");
  }
  if (/\b(rate limit|timeout|fail|error)\b/i.test(normalized)) {
    return [
      "Kitchen Sink text fixture:",
      `prompt="${normalized}"`,
      "Failure fixtures are available: rate limit returns 429 with retry metadata, timeout returns 504, and fail returns a deterministic provider error.",
    ].join(" ");
  }
  return [
    "Kitchen Sink text fixture:",
    `prompt="${normalized}"`,
    "Available realistic surfaces: direct prefix, registered tools, image provider lifecycle, media understanding, web search, web fetch, channel health, hooks, detached tasks, and text provider catalog.",
  ].join(" ");
}

export function kitchenImageDescription(prompt, count) {
  return [
    `Kitchen Sink media fixture described ${count || 1} image${count === 1 ? "" : "s"}.`,
    `Prompt: ${normalizePrompt(prompt, "describe kitchen sink image")}.`,
    "Visible content: the bundled kitchen_sink_office PNG: an office lobby scene with a lobster-costumed figure holding a real sink.",
  ].join(" ");
}

export function kitchenToolSchema(promptDescription) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      prompt: { type: "string", description: promptDescription },
    },
  };
}

export function kitchenSearchSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string", description: "Kitchen Sink fixture search query." },
    },
  };
}

export function stripDataUrl(image) {
  const { dataUrl, ...asset } = image;
  return asset;
}

export function renderSearchText(result) {
  if (result.error) {
    return `Kitchen Sink search failed: ${result.error.message}`;
  }
  if (result.results.length === 0) {
    return result.answer || "Kitchen Sink search returned no results.";
  }
  return result.results.map((entry, index) => `${index + 1}. ${entry.title} - ${entry.snippet}`).join("\n");
}

export function readPrompt(input) {
  return normalizePrompt(readString(input, "prompt") || readString(input, "input"), "kitchen sink fixture");
}

export function readQuery(input) {
  return normalizePrompt(readString(input, "query") || readPrompt(input), "kitchen sink");
}

export function readUrl(input) {
  return normalizePrompt(readString(input, "url") || readString(input, "query"), "kitchen://fixture/readme");
}

export function extractInteractiveText(ctx) {
  if (typeof ctx === "string") {
    return ctx;
  }
  if (!ctx || typeof ctx !== "object") {
    return "";
  }
  for (const key of ["text", "message", "body", "input", "content", "commandBody"]) {
    if (typeof ctx[key] === "string") {
      return ctx[key];
    }
  }
  if (ctx.message && typeof ctx.message === "object") {
    return extractInteractiveText(ctx.message);
  }
  return "";
}

export function observeKitchenHook(name, event, context) {
  const toolId = firstHookString(event, ["toolId", "toolName", "name", "id"]) ||
    firstHookString(event?.tool, ["id", "name"]);
  const providerId = firstHookString(event, ["providerId", "provider", "selectedProvider"]) ||
    firstHookString(context, ["providerId", "provider", "selectedProvider"]);
  const url = firstHookString(event, ["url"]) || firstHookString(event?.args, ["url"]);
  const text = extractHookText(event) || extractHookText(context);
  const scenarioId = inferKitchenScenario({ providerId, text, toolId, url });
  const observation = {
    kitchenSink: true,
    pluginId: PLUGIN_ID,
    hook: name,
    route: `hook:${name}`,
    matchedKitchen: scenarioId !== "observe",
    scenarioId,
    observedEventKeys: Object.keys(event ?? {}),
    observedContextKeys: Object.keys(context ?? {}),
  };

  if (name === "before_tool_call") {
    return {
      ...observation,
      ...createBeforeToolCallDecision({ event, scenarioId, text, toolId }),
    };
  }

  if (name === "llm_input" || name === "llm_output" || name === "agent_end") {
    return {
      ...observation,
      privacy: createConversationPrivacyProbe({ event, context, text }),
    };
  }

  return observation;
}

function createKitchenJob(kind, prompt, date, delayMs, scenarioId, route) {
  const id = `ks_${kind}_${stableHash(`${kind}:${prompt}`).slice(0, 10)}`;
  const createdAt = date.toISOString();
  return {
    id,
    kind,
    status: "queued",
    prompt,
    delayMs,
    createdAt,
    queuedAt: createdAt,
    lastEventAt: createdAt,
    progressPercent: 0,
    progressSummary: "Kitchen Sink job queued.",
    pluginId: PLUGIN_ID,
    scenarioId,
    route: route || defaultRouteForScenario(scenarioId),
    statusUrl: `kitchen://jobs/${id}`,
    timeline: [{ status: "queued", at: createdAt, summary: "Kitchen Sink job queued." }],
  };
}

function transitionKitchenJob(job, status, date, patch = {}) {
  const at = date.toISOString();
  const summary = patch.progressSummary || `Kitchen Sink job ${status}.`;
  return {
    ...job,
    ...patch,
    status,
    startedAt: status === "running" ? at : job.startedAt,
    completedAt: status === "completed" ? patch.completedAt || at : job.completedAt,
    failedAt: status === "failed" ? at : job.failedAt,
    lastEventAt: at,
    timeline: [...(job.timeline || []), { status, at, summary }],
  };
}

function createAssistantMessageEventStream() {
  const queue = [];
  const waiters = [];
  let done = false;
  let finalResult;
  let resolveResult;
  const resultPromise = new Promise((resolve) => {
    resolveResult = resolve;
  });

  return {
    push(event) {
      if (done) {
        return;
      }
      if (event.type === "done" || event.type === "error") {
        finalResult = event.type === "done" ? event.message : event.error;
        done = true;
        resolveResult(finalResult);
      }
      const waiter = waiters.shift();
      if (waiter) {
        waiter({ value: event, done: false });
      } else {
        queue.push(event);
      }
    },
    end(result) {
      if (result !== undefined && finalResult === undefined) {
        finalResult = result;
        resolveResult(result);
      }
      done = true;
      while (waiters.length > 0) {
        waiters.shift()({ value: undefined, done: true });
      }
    },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift();
        } else if (done) {
          return;
        } else {
          const next = await new Promise((resolve) => waiters.push(resolve));
          if (next.done) {
            return;
          }
          yield next.value;
        }
      }
    },
    result() {
      return resultPromise;
    },
  };
}

function extractLastUserPrompt(context) {
  const messages = Array.isArray(context?.messages) ? context.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") {
      continue;
    }
    if (typeof message.content === "string") {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      const text = message.content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join(" ")
        .trim();
      if (text) {
        return text;
      }
    }
  }
  return "kitchen sink text inference";
}

function estimateUsage(prompt = "", text = "") {
  const input = estimateTokens(prompt);
  const output = estimateTokens(text);
  return {
    input,
    output,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: input + output,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text).trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function classifyKitchenFailure(prompt) {
  const text = String(prompt ?? "").toLowerCase();
  if (/\brate[ -]?limit|429|too many requests\b/.test(text)) {
    return {
      code: "rate_limited",
      statusCode: 429,
      message: "Kitchen Sink fixture simulated a provider rate limit.",
      retryable: true,
      retryAfterMs: 30_000,
    };
  }
  if (/\btimeout|timed out|504\b/.test(text)) {
    return {
      code: "timeout",
      statusCode: 504,
      message: "Kitchen Sink fixture simulated an upstream timeout.",
      retryable: true,
      retryAfterMs: 5_000,
    };
  }
  if (/\bfail|error|500\b/.test(text)) {
    return {
      code: "fixture_failed",
      statusCode: 500,
      message: "Kitchen Sink fixture simulated a provider failure.",
      retryable: false,
    };
  }
  return undefined;
}

function selectKitchenImageFixture(_prompt) {
  return KITCHEN_IMAGE_FIXTURES[0];
}

function mediaJob(kind, id, prompt, scenarioId) {
  const createdAt = "2026-04-28T00:00:00.000Z";
  return {
    id,
    kind,
    status: "completed",
    prompt,
    createdAt,
    completedAt: createdAt,
    pluginId: PLUGIN_ID,
    scenarioId,
    progressPercent: 100,
    timeline: [
      { status: "queued", at: createdAt, summary: `Kitchen Sink ${kind} job queued.` },
      { status: "running", at: createdAt, summary: `Kitchen Sink ${kind} job running.` },
      { status: "completed", at: createdAt, summary: `Kitchen Sink ${kind} job completed.` },
    ],
  };
}

function fixtureMetadata(scenarioId, providerId, extra = {}) {
  return {
    kitchenSink: true,
    pluginId: PLUGIN_ID,
    providerId,
    scenarioId,
    ...extra,
  };
}

function createKitchenWavBuffer(seedText) {
  const sampleRate = 16_000;
  const durationSeconds = 0.48;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  const frequency = 360 + (Number.parseInt(stableHash(seedText).slice(0, 2), 16) % 160);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.sin((Math.PI * index) / sampleCount);
    const sample = Math.round(Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 12000 * envelope);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  return buffer;
}

function dataUrlForJson(mimeType, value) {
  return `data:${mimeType};base64,${Buffer.from(JSON.stringify(value), "utf8").toString("base64")}`;
}

function inferByteLength(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.byteLength === "number") {
    return value.byteLength;
  }
  if (typeof value.length === "number") {
    return value.length;
  }
  return Buffer.byteLength(String(value));
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readString(input, key) {
  if (input && typeof input === "object" && typeof input[key] === "string") {
    return input[key];
  }
  if (typeof input === "string" && key === "prompt") {
    return input;
  }
  return "";
}

function inferKitchenScenario({ providerId, text, toolId, url }) {
  const haystack = [providerId, text, toolId, url].filter(Boolean).join(" ").toLowerCase();
  if (toolId === "kitchen_sink_image_job" || providerId === IMAGE_PROVIDER_ID) {
    return "image.generate";
  }
  if (toolId === "kitchen_sink_search" || providerId === WEB_SEARCH_PROVIDER_ID) {
    return "web.search";
  }
  if (providerId === WEB_FETCH_PROVIDER_ID || url) {
    return "web.fetch";
  }
  if (providerId === MEDIA_PROVIDER_ID) {
    return "image.describe";
  }
  if (toolId === "kitchen_sink_text" || providerId === TEXT_PROVIDER_ID) {
    return "text.reply";
  }
  if (/\bkitchen\b/.test(haystack) && /\b(image|picture|draw|generate)\b/.test(haystack)) {
    return "image.generate";
  }
  if (/\bkitchen\b/.test(haystack) && /\b(search|find|lookup|web)\b/.test(haystack)) {
    return "web.search";
  }
  if (/\bkitchen\b/.test(haystack)) {
    return "text.reply";
  }
  return "observe";
}

function extractHookText(value) {
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value : "";
  }
  return (
    firstHookString(value, ["prompt", "query", "text", "input", "content", "commandBody"]) ||
    firstHookString(value.args, ["prompt", "query", "text", "input", "content", "commandBody"]) ||
    extractInteractiveText(value)
  );
}

function createBeforeToolCallDecision({ event, scenarioId, text, toolId }) {
  const params = createToolCallParams(event, scenarioId);
  const lowerText = String(text ?? "").toLowerCase();
  if (/\b(block|deny|forbid)\b/.test(lowerText)) {
    return {
      params,
      block: true,
      blockReason: `Kitchen Sink fixture blocked ${toolId || "tool"} for ${scenarioId}.`,
      terminal: true,
      decision: "block",
    };
  }
  if (/\b(approval|approve|permission)\b/.test(lowerText)) {
    const approvalId = `ks_approval_${stableHash(`${toolId}:${text}:${scenarioId}`).slice(0, 10)}`;
    return {
      params,
      requireApproval: {
        id: approvalId,
        title: "Kitchen Sink tool approval",
        reason: `Kitchen Sink fixture requires approval before ${toolId || "tool"} runs.`,
        summary: `Approve deterministic ${scenarioId} fixture execution.`,
        scenarioId,
        pluginId: PLUGIN_ID,
      },
      decision: "approval",
    };
  }
  return {
    params,
    decision: scenarioId === "observe" ? "observe" : "allow",
  };
}

function createToolCallParams(event, scenarioId) {
  const rawParams = event?.params && typeof event.params === "object" ? event.params : {};
  const rawArgs = event?.args && typeof event.args === "object" ? event.args : {};
  return {
    ...rawParams,
    args: {
      ...rawArgs,
      kitchenSinkScenario: scenarioId,
      kitchenSinkPluginId: PLUGIN_ID,
    },
  };
}

function createConversationPrivacyProbe({ event, context, text }) {
  const eventText = extractHookText(event);
  const contextText = extractHookText(context);
  const combined = [text, eventText, contextText].filter(Boolean).join("\n");
  const redactedFields = [];
  for (const [label, value] of [
    ["event.apiKey", event?.apiKey],
    ["event.authorization", event?.authorization],
    ["event.token", event?.token],
    ["context.apiKey", context?.apiKey],
    ["context.authorization", context?.authorization],
    ["context.token", context?.token],
  ]) {
    if (typeof value === "string" && value.trim()) {
      redactedFields.push(label);
    }
  }
  const secretText = [
    combined,
    event?.apiKey,
    event?.authorization,
    event?.token,
    context?.apiKey,
    context?.authorization,
    context?.token,
  ].filter(Boolean).join("\n");
  const secretPatternHits = secretText.match(/\b(?:sk-[a-z0-9_-]+|api[_-]?key|authorization|bearer\s+[a-z0-9._-]+|fixture-token-[a-z0-9_-]+)\b/gi) ?? [];
  return {
    boundary: "conversation-observer",
    promptHash: stableHash(combined || "empty"),
    promptLength: combined.length,
    redactedFields,
    secretPatternCount: secretPatternHits.length,
    storesRawPayload: false,
    exposesRawPayload: false,
  };
}

function firstHookString(source, keys) {
  if (!source || typeof source !== "object") {
    return "";
  }
  for (const key of keys) {
    if (typeof source[key] === "string" && source[key].trim()) {
      return source[key].trim();
    }
  }
  return "";
}

function normalizePrompt(value, fallback) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeDelayMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_IMAGE_DELAY_MS;
  }
  return Math.trunc(value);
}

function normalizeScenario(value) {
  switch (value) {
    case "image.generate":
    case "image.describe":
    case "text.reply":
    case "web.fetch":
    case "web.search":
      return value;
    default:
      return "text.reply";
  }
}

function defaultRouteForScenario(scenarioId) {
  switch (scenarioId) {
    case "image.generate":
      return "provider:image";
    case "image.describe":
      return "provider:media-understanding";
    case "web.fetch":
      return "provider:web-fetch";
    case "web.search":
      return "provider:web-search";
    default:
      return "provider:text";
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
