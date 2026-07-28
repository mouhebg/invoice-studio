import { requireUser } from "../auth";
import { AppShell } from "../components/AppShell";
import { ClientCreateForm } from "../components/ClientCreateForm";
import { ensureAccount, getClients } from "../../db/queries";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser("/clients");
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const clientRows = await getClients(account.id);

  return (
    <AppShell
      active="clients"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Client directory</p>
            <h1>Clients</h1>
            <p>Keep contact and billing information ready for every invoice.</p>
          </div>
          <ClientCreateForm />
        </header>

        <section className="panel">
          {clientRows.length ? (
            <div className="client-grid">
              {clientRows.map((client) => (
                <article className="client-card" key={client.id}>
                  <span className="record-avatar">
                    {client.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2>{client.name}</h2>
                    <p>{client.contactName || "No contact person added"}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{client.email || "Not added"}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{client.phone || "Not added"}</dd>
                    </div>
                    <div>
                      <dt>Billing address</dt>
                      <dd>{client.address || "Not added"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No clients yet.</strong>
              <p>
                Add your first client to make invoice creation faster and more
                accurate.
              </p>
              <ClientCreateForm />
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
