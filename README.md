# OpenClaw Kitchen Sink Plugin

Credential-free OpenClaw plugin fixture that intentionally touches the public
plugin API surface and works as a kitchen sink boilerplate for plugin authors.

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
publishing. The release tag must match `package.json`, for example `v0.0.0` for
version `0.0.0`.

ClawHub publish wiring is present but intentionally not called from CI yet. The
ClawHub org/package ownership for this fixture still needs to be set up before
the dry-run or release publish jobs are enabled.
