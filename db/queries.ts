import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { accounts, clients, invoiceItems, invoices } from "./schema";

type AccountInput = {
  email: string;
  name: string | null;
};

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function ensureAccount({ email, name }: AccountInput) {
  const db = getDb();
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.ownerEmail, email),
  });
  if (existing) return existing;

  const [account] = await db
    .insert(accounts)
    .values({
      id: createId("acct"),
      ownerEmail: email,
      ownerName: name,
      businessEmail: email,
    })
    .returning();
  return account;
}

export async function getClients(accountId: string) {
  return getDb()
    .select()
    .from(clients)
    .where(eq(clients.accountId, accountId))
    .orderBy(desc(clients.updatedAt));
}

export async function getInvoices(accountId: string) {
  return getDb()
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      currency: invoices.currency,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      discount: invoices.discount,
      amountPaid: invoices.amountPaid,
      taxEnabled: invoices.taxEnabled,
      taxRate: invoices.taxRate,
      clientName: clients.name,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.accountId, accountId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceItems(invoiceIds: string[]) {
  if (!invoiceIds.length) return [];
  return getDb()
    .select()
    .from(invoiceItems)
    .where(inArray(invoiceItems.invoiceId, invoiceIds));
}

export async function getInvoice(accountId: string, invoiceId: string) {
  const [invoice] = await getDb()
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.accountId, accountId),
      ),
    )
    .limit(1);
  if (!invoice) return null;

  const [client] = await getDb()
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, invoice.clientId),
        eq(clients.accountId, accountId),
      ),
    )
    .limit(1);
  const items = await getDb()
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.position);

  return { invoice, client, items };
}
