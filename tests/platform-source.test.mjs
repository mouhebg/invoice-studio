import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("declares durable database storage", async () => {
  const database = await readFile(new URL("db/index.ts", root), "utf8");
  const viteConfig = await readFile(new URL("vite.config.ts", root), "utf8");
  assert.match(database, /env\.DB/);
  assert.match(viteConfig, /binding:\s*"DB"/);
});

test("migration creates the account, client, invoice, and line item tables", async () => {
  const migration = await readFile(
    new URL("drizzle/0000_sad_skaar.sql", root),
    "utf8",
  );
  for (const table of ["accounts", "clients", "invoices", "invoice_items"]) {
    assert.match(migration, new RegExp(`CREATE TABLE .${table}.`));
  }
});

test("protected pages require an authenticated user", async () => {
  for (const path of [
    "app/dashboard/page.tsx",
    "app/clients/page.tsx",
    "app/invoices/page.tsx",
    "app/settings/page.tsx",
  ]) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /requireUser/);
  }
});

test("repository source is provider neutral", async () => {
  const sourceFiles = await collectSourceFiles(root);
  const prohibited = new RegExp(
    `${["open", "ai"].join("")}|${["chat", "gpt"].join("")}`,
    "i",
  );
  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, prohibited, file.pathname);
  }
});

test("user-facing source contains no em or en dash", async () => {
  const files = [
    "app/page.tsx",
    "app/globals.css",
    "app/dashboard/page.tsx",
    "app/clients/page.tsx",
    "app/invoices/page.tsx",
    "app/invoices/new/page.tsx",
    "app/invoices/[id]/page.tsx",
  ];
  for (const path of files) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(source, /[—–]/);
  }
});

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".sites-runtime",
  ".vinext",
  ".wrangler",
  "dist",
  "node_modules",
  "outputs",
  "work",
]);

const sourceExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sh",
  ".sql",
  ".ts",
  ".tsx",
]);

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(
          ...(await collectSourceFiles(new URL(`${entry.name}/`, directory))),
        );
      }
      continue;
    }
    const suffix = entry.name.includes(".")
      ? `.${entry.name.split(".").at(-1)}`
      : "";
    if (
      sourceExtensions.has(suffix) ||
      entry.name === ".gitignore" ||
      entry.name === ".npmrc"
    ) {
      files.push(new URL(entry.name, directory));
    }
  }
  return files;
}
