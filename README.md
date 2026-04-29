# 🧽 OpenClaw Kitchen Sink Plugin

Credential-free OpenClaw plugin fixture that intentionally touches the public
plugin API surface and works as a kitchen sink boilerplate for plugin authors.

This repo is both:

- a readable example for plugin authors
- a dummy compatibility fixture for [Crabpot](https://github.com/openclaw/crabpot) and [plugin-inspector](https://github.com/openclaw/plugin-inspector)
- a live plugin `@openclaw/kitchen-sink` that can be installed via clawhub and npm for testing features

The generated runtime probes are credential-free. The hand-owned Kitchen Sink
runtime also registers deterministic direct commands, tools, image generation,
media understanding, web search, web fetch, channel, hook, detached-task, and
text-provider catalog surfaces.
It should not call external services, read secrets, spawn processes, or require
live credentials.

## Kitchen Runtime

The fixture can be used dry, without an LLM:

```text
kitchen image generate a kitchen sink
kitchen search kitchen sink provider routing
kitchen explain the fixture
```

It also exposes provider and tool surfaces for live model routing:

- `src/scenarios.js` is the shared deterministic fixture engine used by dry
  commands, tools, providers, hooks, channel delivery, and tests.
- `kitchen_sink_image_job` returns a deterministic image job, waits 10 seconds
  in real runtime execution, then returns a bundled SVG image payload.
- `kitchen-sink-image` is a registered image generation provider with aliases
  `kitchen`, `kitchen-sink`, and `openclaw-kitchen-sink`.
- `kitchen-sink-media` describes images with deterministic fixture text.
- `kitchen-sink-search` and `kitchen-sink-fetch` provide credential-free web
  tool fixtures.
- `kitchen-sink-channel` is a credential-free channel fixture that can resolve
  local accounts, route outbound sessions, and deliver deterministic text/media
  records.
- `kitchen-sink-llm` exposes a deterministic text-provider catalog row,
  provider-owned stream function, and prompt guidance so live LLM providers can
  discover the Kitchen Sink routes.
- generated hooks classify Kitchen Sink prompts, tool calls, and provider
  selections into shared scenario ids such as `image.generate`, `web.search`,
  and `text.reply`.
- the detached-task runtime records queued/running/completed/cancelled task
  transitions in memory so async OpenClaw task surfaces can be smoke-tested.

## API Surface Sync

The generated fixture is derived from the installed `openclaw` package. It
extracts the public plugin surface from:

- registrar methods
- hook names
- manifest contract fields
- exported plugin SDK subpaths

It then writes explicit static evidence for those surfaces: hook registrations,
registrar calls with no-op callback payloads, SDK import coverage, and manifest
contract coverage.

```sh
npm install
npm run sync:surface
npm test
npm run pack:check
```

The `Update OpenClaw SDK Surface` workflow automatically checks
`openclaw@latest` and `@openclaw/plugin-inspector@latest` every 10 minutes. When
either package changes, it regenerates the pinned dependency, lockfile,
manifest, hooks, registrars, and SDK import fixture files, runs the static and
runtime plugin-inspector checks, then creates and squash-merges its own
automation PR after those checks pass.

Dependabot still watches npm dependencies, but ignores `openclaw` and
`@openclaw/plugin-inspector` because those updates should flow through the
generated updater instead of package-only bump PRs.

## Publishing

Tagged GitHub releases publish the validated package to npm through trusted
publishing. The release tag must match `package.json`, for example `v0.0.1` for
version `0.0.1`.

Use the `Draft Release` workflow to create the tag and generated GitHub release
notes. Publishing that draft release runs the npm publish workflow. `0.0.x`
verification releases publish under the `verification` npm dist-tag so they do
not replace the stable `latest` tag.

Pull requests run a ClawHub package-publish dry run through the canonical
`openclaw/clawhub` reusable workflow on `main`, so the fixture tests the current
ClawHub publishing path instead of a vendored copy. Releases publish to ClawHub
through the same canonical workflow after validation.
