# Test-suite maintenance verification — 20 November 2026

## Scope and baseline

- Branch: local `dev01`.
- Starting commit: `eb1f700839c6a63155d07de5f53045303587e376`.
- Purpose: restore trustworthy test discovery and resolve the 15 pre-existing script-test failures identified during atmospheric-refraction QA.
- No astronomy, React UI, production SEO, authentication-policy, dependency or lockfile changes.
- This is separate from the outstanding refraction QA follow-ups about rendered consumer regression coverage and rounded Explain arithmetic.

The old `npm test` command executed zero tests for its quoted script glob on this Windows setup, then passed its separately enumerated suites. Explicitly enumerating the script files exposed 15 failures, also reproduced on parent commit `6360117` during the preceding QA.

| Baseline failure group | Count | Resolution |
| --- | ---: | --- |
| Windows wrapper execution and link permissions | 5 | Execute programs without a shell; launch Vite's JS entry using Node; use unprivileged Windows junctions for directory-link tests |
| Generic PWA/share-tag fixtures contaminated by the real application's branding | 5 | Give generic injection fixtures an empty workspace; retain explicit per-test workspaces and exact output assertions |
| Homepage canonical expected on the shared root shell | 1 | Assert current index-route ownership and absence of a canonical on the shared shell |
| Missing upstream scaffold prompt/recipe documents | 4 | Retire only those absent-document contract assertions, with rationale in the affected test files |

The four retired tests read `.grok/skills/og/SKILL.md`, its recipe references, or upstream `AGENTS.md`, none of which is shipped by this application. No replacement prompt documents were fabricated. Runtime brand gating, pending-marker expiry, argument validation, atomic-write safety and CLI failures remain covered. No tests were skipped or blanket-disabled.

## Implemented changes

### Portable discovery and failure propagation

`npm test` now runs `node scripts/run-tests.mjs`.

The runner recursively discovers `*.test.mjs` and `*.test.ts` under `scripts/` and `src/`, sorts the explicit file list, and invokes Node without a shell. It ignores dependency/hidden directories and does not follow directory links. An empty discovered suite is an error. Each supported test file is supplied once; the orientation suite no longer needs a duplicate special invocation.

Six runner regression tests cover nested discovery and exclusions, execution of real script and typed fixtures in a path containing spaces, refusal to pass an empty suite, propagation of a failing script test while still executing typed tests, the actual CLI's exit status/root resolution when launched from another directory, and the npm entry-point contract. Nested runner fixtures clear inherited Node test-worker context so the fixture tests really execute; marker files assert that execution occurred.

### Windows process execution

The app-env wrapper now uses `shell: false`. npm's dev/build/build:dev/preview scripts explicitly launch Vite's JavaScript entry through Node, avoiding Windows `.cmd` shell handling. Existing environment-precedence, nonzero-exit and signal tests remain. A new regression asserts literal preservation of arguments containing spaces, quotes and shell metacharacters. The signal test now requires evidence that the child started, so an unrelated launch failure cannot satisfy it.

Directory alias tests use junctions on Windows and directory symlinks elsewhere. The CLI still has to execute through the alias and return the expected observable result; no permission-dependent skip was added.

The Linux sandbox preview process matcher was updated to recognize the new `vite.js preview` command shape as well as the existing shim form. Positive wrapper/child cases and a negative `vite.js build` case protect preview ownership detection. The surrounding sandbox-only `/proc` lifecycle is otherwise unchanged.

### Fixture and metadata contracts

PWA injection tests now use an explicitly empty default workspace, preventing caller-cwd `site.json` and `og.jpg` from changing generic fallback expectations. A new regression creates unrelated branding and verifies ordinary and streaming fixture injection remain isolated. Explicit workspace and baked-identity cases retain their original assertions.

Homepage tests assert the approved title, description and app-name defaults on `__root.tsx`, and exactly one homepage canonical on `index.tsx`. They assert that the shared shell owns no canonical, preserving route-specific canonical behavior.

The README documents automatic discovery and the separate browser checks.

## Red/green evidence

- Before the Windows fixes, the focused wrapper/auth suite returned **23 tests: 18 passed, 5 failed**.
- The new discovery test initially failed because no portable runner existed; the real execution test then failed until the runner executed discovered files.
- The empty-suite regression failed on silent zero-test success before the fail-closed check was added.
- The npm entry-point assertion failed against the previous shell-glob command.
- The new literal-argument regression failed under Windows shell parsing before the wrapper was changed.
- The four scaffold test files initially returned **90 tests: 80 passed, 10 failed**. After retiring four orphan document tests and adding fixture/SEO coverage, they returned **88 passed, 0 failed, 0 skipped**.
- New Vite-JS preview ownership assertions failed before the matcher was updated; all **20 preview-tool tests** then passed.

## Verification results

Environment exercised: Windows, Node `v24.14.1`, npm `11.2.0`; no dependency installation or upgrade was required.

From `app/`:

| Command / check | Result |
| --- | --- |
| `npm test` | **37 files; 456 passed, 0 failed, 0 skipped, 0 cancelled** |
| `npm test -- --test-concurrency=1` | **37 files; 456 passed, 0 failed, 0 skipped, 0 cancelled** |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| Installed ESLint on all 11 touched/new `.mjs` files | Pass |
| Installed Prettier check on those scripts and `package.json` | Pass |
| `git diff --check` | Pass |
| App-env invariant against fresh dev server | Pass; dev/build agree on sign-in off |
| Fresh `npm run dev` on loopback port 8082 | Started through the new shell-free command |
| `check-moon-path-flow.mjs` against port 8082 | Pass: Pixel portrait/landscape, 1280×800 and 1440×900 |
| `check-workspaces.mjs` against port 8082 | Pass: both routes, live interaction, return state and Back |
| Fresh `npm run preview` on loopback port 8083 | Started through the new shell-free command |
| Production-preview HTTP checks | `/`, `/guide/`, `/lunar-parallax/` all returned 200 |
| Both browser check scripts against port 8083 | Pass with the same viewport/workspace coverage |

The build retains existing large-chunk and bundler-directive warnings. Database migration reports a skip because `DATABASE_URL` is unset. These are not hidden test failures. The shell-spawn deprecation warning from the old Windows wrapper no longer occurs on the verified build path.

Raw default/serial test logs, typecheck log and a machine-readable summary were saved outside the repository at:

`C:/Users/clive/AppData/Local/hermes/profiles/moongeometry/cache/scratch/test-suite-maintenance/`

The ordinary and serial runs have identical test counts, and the verification harness checks that the counts are nonzero and that no failures/skips were reported. This record is committed so the essential evidence does not depend on retaining scratch logs.

## Limits and preservation

- Actual execution was verified on Windows, not on a separate Linux/macOS host. POSIX branches retain direct executable spawning and directory-symlink behavior.
- Pure preview-owner classification tests run on Windows; the pre-existing Linux-only `/proc` stop/restart lifecycle was not exercised end-to-end here.
- Full-project lint was not expanded to unrelated imported code. Every script touched by this maintenance change passed targeted lint and formatting checks.
- Existing unrelated sketch, planning-document and `.hermes` changes were preserved and excluded from this maintenance commit.
- No push, merge, deployment or production change is part of this work.
