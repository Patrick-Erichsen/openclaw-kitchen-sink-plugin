# OpenClaw Kitchen Sink Plugin

Credential-free OpenClaw plugin fixture that intentionally touches the public
plugin API surface.

This repo is both:

- a readable example for plugin authors
- a dummy compatibility fixture for [Crabpot](https://github.com/openclaw/crabpot) and [plugin-inspector](https://github.com/openclaw/plugin-inspector)

The runtime handlers are no-op probes. They should not call external services,
read secrets, spawn processes, or require live credentials.

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
