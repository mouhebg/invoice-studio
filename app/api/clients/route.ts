import { getUser } from "../../auth";
import { createId, ensureAccount, getClients } from "../../../db/queries";
import { getDb } from "../../../db";
import { clients } from "../../../db/schema";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  return Response.json({ clients: await getClients(account.id) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await request.json()) as Record<string, unknown>;
  const name = String(payload.name || "").trim();
  if (!name) {
    return Response.json(
      { error: "Client or company name is required." },
      { status: 400 },
    );
  }

  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const [client] = await getDb()
    .insert(clients)
    .values({
      id: createId("client"),
      accountId: account.id,
      name,
      contactName: String(payload.contactName || "").trim(),
      email: String(payload.email || "").trim(),
      phone: String(payload.phone || "").trim(),
      address: String(payload.address || "").trim(),
      notes: String(payload.notes || "").trim(),
    })
    .returning();

  return Response.json({ client }, { status: 201 });
}
