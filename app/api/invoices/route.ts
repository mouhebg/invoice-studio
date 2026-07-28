import { getUser } from "../../auth";
import { createId, ensureAccount } from "../../../db/queries";
import { getDb } from "../../../db";
import { and, eq } from "drizzle-orm";
import { clients, invoiceItems, invoices } from "../../../db/schema";

const allowedCurrencies = new Set(["CAD", "USD", "EUR", "GBP", "TND"]);

type InvoiceItemInput = {
  description?: unknown;
  quantity?: unknown;
  rate?: unknown;
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = (await request.json()) as Record<string, unknown> & {
    items?: InvoiceItemInput[];
  };

  const number = String(payload.number || "").trim();
  const clientId = String(payload.clientId || "").trim();
  const currency = String(payload.currency || "CAD");
  const issueDate = String(payload.issueDate || "");
  const dueDate = String(payload.dueDate || "");
  const items = Array.isArray(payload.items)
    ? payload.items
        .map((item) => ({
          description: String(item.description || "").trim(),
          quantity: Math.max(Number(item.quantity) || 0, 0),
          rate: Math.max(Number(item.rate) || 0, 0),
        }))
        .filter((item) => item.description)
    : [];

  if (!number || !clientId || !issueDate || !dueDate || !items.length) {
    return Response.json(
      { error: "Client, invoice number, dates, and one line item are required." },
      { status: 400 },
    );
  }
  if (!allowedCurrencies.has(currency)) {
    return Response.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const db = getDb();
  const invoiceId = createId("inv");
  const [ownedClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(eq(clients.id, clientId), eq(clients.accountId, account.id)),
    )
    .limit(1);
  if (!ownedClient) {
    return Response.json({ error: "Client not found." }, { status: 404 });
  }

  try {
    const [invoice] = await db
      .insert(invoices)
      .values({
        id: invoiceId,
        accountId: account.id,
        clientId,
        number,
        currency,
        issueDate,
        dueDate,
        discount: Math.max(Number(payload.discount) || 0, 0),
        taxEnabled: Boolean(payload.taxEnabled),
        taxRate: Math.max(Number(payload.taxRate) || 0, 0),
        paymentInstructions: String(
          payload.paymentInstructions || "",
        ).trim(),
        notes: String(payload.notes || "").trim(),
        recurringCadence:
          String(payload.recurringCadence || "").trim() || null,
      })
      .returning();

    await db.insert(invoiceItems).values(
      items.map((item, position) => ({
        id: createId("item"),
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        position,
      })),
    );

    return Response.json({ invoice }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("UNIQUE")
        ? "That invoice number is already in use."
        : "The invoice could not be created.";
    return Response.json({ error: message }, { status: 400 });
  }
}
