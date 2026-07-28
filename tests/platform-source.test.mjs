import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("declares durable database storage", async () => {
  const localHosting = new URL(".openai/hosting.json", root);
  const publicHosting = new URL(".openai/hosting.example.json", root);
  const hostingFile = await access(localHosting)
    .then(() => localHosting)
    .catch(() => publicHosting);
  const hosting = JSON.parse(
    await readFile(hostingFile, "utf8"),
  );
  assert.equal(hosting.d1, "DB");
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
    assert.match(source, /requireChatGPTUser/);
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
