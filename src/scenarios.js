export const PLUGIN_ID = "openclaw-kitchen-sink-fixture";
export const IMAGE_PROVIDER_ID = "kitchen-sink-image";
export const MEDIA_PROVIDER_ID = "kitchen-sink-media";
export const TEXT_PROVIDER_ID = "kitchen-sink-llm";
export const WEB_SEARCH_PROVIDER_ID = "kitchen-sink-search";
export const WEB_FETCH_PROVIDER_ID = "kitchen-sink-fetch";
export const CHANNEL_ID = "kitchen-sink-channel";
export const CHANNEL_ACCOUNT_ID = "local";
export const DEFAULT_IMAGE_MODEL = "kitchen-sink-image-v1";
export const DEFAULT_MEDIA_MODEL = "kitchen-sink-vision-v1";
export const DEFAULT_TEXT_MODEL = "kitchen-sink-text-v1";
export const DEFAULT_IMAGE_DELAY_MS = 10_000;

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
    const job = createKitchenJob("image", prompt, runtime.now(), runtime.delayMs, scenario, request.route);
    await runtime.sleep(runtime.delayMs);
    const completedJob = { ...job, status: "completed", completedAt: runtime.now().toISOString() };
    const image = createKitchenSinkImageAsset({ prompt, jobId: job.id, scenario });
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
  return {
    scenarioId: "text.reply",
    route: request.route || "provider:text",
    job: { ...job, status: "completed", completedAt: runtime.now().toISOString() },
    text: kitchenTextResponse(prompt),
  };
}

export function createKitchenSinkImageAsset({ prompt, jobId, scenario = "image.generate" }) {
  const svg = renderKitchenSinkSvg({ prompt, jobId });
  const buffer = Buffer.from(svg, "utf8");
  return {
    buffer,
    mimeType: "image/svg+xml",
    fileName: `${jobId}.svg`,
    dataUrl: `data:image/svg+xml;base64,${buffer.toString("base64")}`,
    revisedPrompt: `Kitchen sink fixture image for: ${prompt}`,
    metadata: {
      kitchenSink: true,
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
    meta: {
      kitchenSink: true,
      pluginId: PLUGIN_ID,
      scenarioId: inferKitchenScenario({ text }),
      kind,
    },
  };
}

export function kitchenChannelAccount(accountId = CHANNEL_ACCOUNT_ID) {
  return {
    accountId: accountId || CHANNEL_ACCOUNT_ID,
    name: "Kitchen Sink Local",
    enabled: true,
    configured: true,
    statusState: "fixture",
    linked: true,
    running: true,
    connected: true,
    mode: "local",
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
  return {
    ...result,
    mediaUrl: result.image.dataUrl,
  };
}

export async function runKitchenSearch(query) {
  const normalized = normalizePrompt(query, "kitchen sink");
  return {
    provider: WEB_SEARCH_PROVIDER_ID,
    query: normalized,
    results: [
      {
        title: "Kitchen Sink image fixture",
        url: "https://github.com/openclaw/kitchen-sink#image-fixture",
        snippet: `Deterministic image job route for "${normalized}".`,
      },
      {
        title: "Kitchen Sink dry command route",
        url: "https://github.com/openclaw/kitchen-sink#dry-command-route",
        snippet: "The kitchen prefix works without live LLM credentials.",
      },
      {
        title: "Kitchen Sink provider route",
        url: "https://github.com/openclaw/kitchen-sink#provider-route",
        snippet: "The image, media, text, fetch, and search providers are registered by the plugin.",
      },
    ],
  };
}

export async function runKitchenFetch(url) {
  const target = normalizePrompt(url, "kitchen://fixture/readme");
  return {
    provider: WEB_FETCH_PROVIDER_ID,
    url: target,
    title: "Kitchen Sink fixture document",
    content: `Kitchen Sink fetched "${target}". This deterministic document proves plugin web-fetch routing without network access.`,
  };
}

export function kitchenImageReply(result) {
  return {
    text:
      `kitchen image job ${result.job.id} completed after ${Math.round(result.job.delayMs / 1000)}s. ` +
      `provider=${IMAGE_PROVIDER_ID} model=${DEFAULT_IMAGE_MODEL}`,
    mediaUrl: result.image.dataUrl,
    presentation: {
      title: "Kitchen Sink Image",
      tone: "success",
      blocks: [
        { type: "text", text: `job: ${result.job.id}` },
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
    const text = kitchenTextResponse(extractLastUserPrompt(context));
    const message = {
      role: "assistant",
      content: [{ type: "text", text }],
      api: model?.api || "kitchen-sink",
      provider: TEXT_PROVIDER_ID,
      model: model?.id || DEFAULT_TEXT_MODEL,
      usage: zeroUsage(),
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
  return [
    "kitchen sink text fixture:",
    `prompt="${prompt}"`,
    "routes: direct prefix, registered tools, image provider, media understanding, web search, web fetch, and text provider catalog.",
  ].join(" ");
}

export function kitchenImageDescription(prompt, count) {
  return [
    `Kitchen Sink media fixture described ${count || 1} image${count === 1 ? "" : "s"}.`,
    `Prompt: ${normalizePrompt(prompt, "describe kitchen sink image")}.`,
    "Visible content: a deterministic sink basin, faucet, job id label, and OpenClaw fixture badge.",
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

  return {
    kitchenSink: true,
    pluginId: PLUGIN_ID,
    hook: name,
    route: `hook:${name}`,
    matchedKitchen: scenarioId !== "observe",
    scenarioId,
    observedEventKeys: Object.keys(event ?? {}),
    observedContextKeys: Object.keys(context ?? {}),
  };
}

function createKitchenJob(kind, prompt, date, delayMs, scenarioId, route) {
  const id = `ks_${kind}_${stableHash(`${kind}:${prompt}`).slice(0, 10)}`;
  return {
    id,
    kind,
    status: "running",
    prompt,
    delayMs,
    createdAt: date.toISOString(),
    pluginId: PLUGIN_ID,
    scenarioId,
    route: route || defaultRouteForScenario(scenarioId),
  };
}

function renderKitchenSinkSvg({ prompt, jobId }) {
  const safePrompt = escapeXml(prompt).slice(0, 180);
  const safeJobId = escapeXml(jobId);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f7f3ea"/>
  <rect x="96" y="150" width="832" height="724" rx="48" fill="#24313a"/>
  <rect x="154" y="248" width="716" height="530" rx="72" fill="#d8e7e5"/>
  <rect x="234" y="320" width="556" height="380" rx="54" fill="#f8fbf9"/>
  <path d="M342 416h340c38 0 68 30 68 68v66c0 82-66 148-148 148H422c-82 0-148-66-148-148v-66c0-38 30-68 68-68Z" fill="#b7d4d1"/>
  <path d="M464 388v-64c0-72 58-130 130-130h78v70h-78c-33 0-60 27-60 60v64h-70Z" fill="#5b707a"/>
  <rect x="620" y="190" width="144" height="74" rx="28" fill="#5b707a"/>
  <circle cx="512" cy="560" r="46" fill="#24313a"/>
  <circle cx="512" cy="560" r="22" fill="#8fa5a3"/>
  <text x="512" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#f7f3ea">Kitchen Sink Fixture</text>
  <text x="512" y="890" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#d8e7e5">${safeJobId}</text>
  <text x="512" y="940" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#24313a">${safePrompt}</text>
</svg>`;
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

function zeroUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
