import { eq } from "drizzle-orm";
import { getUser } from "../../auth";
import { ensureAccount } from "../../../db/queries";
import { getDb } from "../../../db";
import { accounts } from "../../../db/schema";

const allowedCurrencies = new Set(["CAD", "USD", "EUR", "GBP", "TND"]);

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = (await request.json()) as Record<string, unknown>;
  const businessName = String(payload.businessName || "").trim();
  const defaultCurrency = String(payload.defaultCurrency || "CAD");

  if (!businessName) {
    return Response.json(
      { error: "Business or professional name is required." },
      { status: 400 },
    );
  }
  if (!allowedCurrencies.has(defaultCurrency)) {
    return Response.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const [updated] = await getDb()
    .update(accounts)
    .set({
      businessName,
      businessEmail: String(payload.businessEmail || "").trim(),
      phone: String(payload.phone || "").trim(),
      address: String(payload.address || "").trim(),
      taxNumber: String(payload.taxNumber || "").trim(),
      defaultCurrency,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accounts.id, account.id))
    .returning();

  return Response.json({ account: updated });
}
