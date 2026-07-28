import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { ensureAccount } from "../../../../db/queries";
import { getDb } from "../../../../db";
import { invoices } from "../../../../db/schema";

const allowedStatuses = new Set(["draft", "sent", "paid"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = (await request.json()) as Record<string, unknown>;
  const status = String(payload.status || "");

  if (!allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid invoice status." }, { status: 400 });
  }

  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const [invoice] = await getDb()
    .update(invoices)
    .set({
      status: status as "draft" | "sent" | "paid",
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.accountId, account.id)))
    .returning();

  if (!invoice) {
    return Response.json({ error: "Invoice not found." }, { status: 404 });
  }
  return Response.json({ invoice });
}
