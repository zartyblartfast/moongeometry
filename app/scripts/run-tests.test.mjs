import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), "moon tests "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function put(root, relative, contents = "") {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

async function runner() {
  assert.ok(
    existsSync(new URL("./run-tests.mjs", import.meta.url)),
    "a portable test runner must exist instead of relying on shell glob expansion",
  );
  return import("./run-tests.mjs");
}

test("discovers nested script and TypeScript tests once in stable order", async (t) => {
  const root = workspace(t);
  put(root, "scripts/top.test.mjs");
  put(root, "scripts/nested/second.test.mjs");
  put(root, "src/lib/first.test.ts");
  put(root, "src/lib/helper.ts");
  put(root, "scripts/node_modules/dependency.test.mjs");
  put(root, "scripts/.cache/generated.test.mjs");
  put(root, "public/not-a-unit.test.mjs");
  const { discoverTestFiles } = await runner();
  assert.deepEqual(discoverTestFiles(root), [
    "scripts/nested/second.test.mjs",
    "scripts/top.test.mjs",
    "src/lib/first.test.ts",
  ]);
});

test("runs script and typed tests from a workspace containing spaces", async (t) => {
  const root = workspace(t);
  put(
    root,
    "scripts/passing.test.mjs",
    'import test from "node:test"; import { writeFileSync } from "node:fs"; test("script", () => writeFileSync("script-ran", "yes"));',
  );
  put(
    root,
    "src/passing.test.ts",
    'import test from "node:test"; import { writeFileSync } from "node:fs"; const value: string = "yes"; test("typed", () => writeFileSync("typed-ran", value));',
  );
  const { runTestSuite } = await runner();
  assert.equal(
    typeof runTestSuite,
    "function",
    "runner must execute the discovered tests",
  );
  assert.equal(runTestSuite({ root, stdio: "pipe" }), 0);
  assert.ok(
    existsSync(join(root, "script-ran")),
    "script tests really executed",
  );
  assert.ok(existsSync(join(root, "typed-ran")), "typed tests really executed");
});

test("refuses an empty suite instead of silently passing zero tests", async (t) => {
  const root = workspace(t);
  const { runTestSuite } = await runner();
  assert.throws(
    () => runTestSuite({ root, stdio: "pipe" }),
    /No test files discovered/,
  );
});

test("a failing script test makes the suite fail without omitting typed tests", async (t) => {
  const root = workspace(t);
  put(
    root,
    "scripts/failing.test.mjs",
    'import test from "node:test"; test("intentional failure", () => { throw new Error("fixture failure"); });',
  );
  put(
    root,
    "src/passing.test.ts",
    'import test from "node:test"; import { writeFileSync } from "node:fs"; test("still runs", () => writeFileSync("typed-ran", "yes"));',
  );
  const { runTestSuite } = await runner();
  assert.equal(runTestSuite({ root, stdio: "pipe" }), 1);
  assert.ok(existsSync(join(root, "typed-ran")));
});

test("CLI propagates a discovered failure even when launched from another cwd", (t) => {
  const root = workspace(t);
  const caller = workspace(t);
  for (const file of ["run-tests.mjs", "with-app-env.mjs"]) {
    put(
      root,
      `scripts/${file}`,
      readFileSync(new URL(file, import.meta.url), "utf8"),
    );
  }
  put(
    root,
    "scripts/failing.test.mjs",
    'import test from "node:test"; test("fixture failure", () => { throw new Error("intentional failure"); });',
  );
  put(
    root,
    "src/passing.test.ts",
    'import test from "node:test"; import { writeFileSync } from "node:fs"; test("typed file runs", () => writeFileSync("typed-ran", "yes"));',
  );
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/run-tests.mjs")],
    { cwd: caller, encoding: "utf8" },
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /Discovered 2 script\/TypeScript test files/);
  assert.ok(existsSync(join(root, "typed-ran")));
  assert.equal(existsSync(join(caller, "typed-ran")), false);
});

test("npm test uses the discovery runner instead of shell-dependent globs", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.scripts.test, "node scripts/run-tests.mjs");
});
