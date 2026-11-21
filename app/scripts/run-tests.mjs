#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  exitStatusFromChild,
  isMainModule,
  projectRoot,
} from "./with-app-env.mjs";

/** Enumerate supported unit tests without depending on a platform's shell. */
export function discoverTestFiles(root) {
  const files = [];
  function visit(directory) {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && /\.test\.(?:mjs|ts)$/.test(entry.name)) {
        files.push(relative(root, path).replaceAll("\\", "/"));
      }
    }
  }
  for (const directory of ["scripts", "src"]) visit(join(root, directory));
  return files.sort();
}

/** Run both suites in one shell-free Node test process, propagating failure. */
export function runTestSuite({
  root = projectRoot(),
  stdio = "inherit",
  nodeArgs = [],
} = {}) {
  const files = discoverTestFiles(root);
  if (files.length === 0)
    throw new Error(`No test files discovered under ${root}`);
  const env = { ...process.env };
  // Tests of this runner start a genuinely independent child test process.
  delete env.NODE_TEST_CONTEXT;
  console.log(
    `[tests] Discovered ${files.length} script/TypeScript test files.`,
  );
  const child = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", ...nodeArgs, ...files],
    { cwd: root, stdio, env, shell: false },
  );
  if (child.error) throw child.error;
  return exitStatusFromChild(child.status, child.signal);
}

if (isMainModule(import.meta.url)) {
  try {
    process.exitCode = runTestSuite({ nodeArgs: process.argv.slice(2) });
  } catch (error) {
    console.error(`[tests] ${error.message}`);
    process.exitCode = 1;
  }
}
