# Grok Prototype Import Notes

Source archive:

- `moon-path-source.zip`

Extracted application source:

- `app/`

Supporting project/specification documents remain in the repository root.

Portable Node.js 22 installation:

- `tools/node-v22.23.3-win-x64/`

Activation in Git Bash / Hermes terminal:

```sh
export PATH='/c/hermes/moongeometry/tools/node-v22.23.3-win-x64':$PATH
cd C:/hermes/moongeometry/app
node --version
npm --version
```

Expected:

```text
v22.23.3
10.9.9
```

Setup completed:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Verification status:

- dependencies installed successfully
- TypeScript typecheck passed
- test suite passed: 64 tests, 0 failures, including `src/lib/astro.test.ts` astronomy/model tests
- production build passed
- migration step skipped because `DATABASE_URL` is not set; the app reports that PGLite fallback migrates itself

Windows compatibility note:

`app/scripts/with-app-env.mjs` was patched to spawn child commands with `shell: process.platform === "win32"`. Without this, `npm run build` failed on Windows with `spawn vite ENOENT` because the wrapper could not launch the local npm binary command directly.
