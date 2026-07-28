import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";
import { AppShell } from "../components/AppShell";
import {
  ensureAccount,
  getClients,
  getInvoiceItems,
  getInvoices,
} from "../../db/queries";
import { calculateInvoiceTotal } from "../../lib/invoice-math";
import {
  effectiveInvoiceStatus,
  formatDate,
  formatMoney,
} from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/dashboard");
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const [clientRows, invoiceRows] = await Promise.all([
    getClients(account.id),
    getInvoices(account.id),
  ]);
  const itemRows = await getInvoiceItems(invoiceRows.map((row) => row.id));
  const itemsByInvoice = itemRows.reduce((groups, item) => {
    const items = groups.get(item.invoiceId) ?? [];
    items.push(item);
    groups.set(item.invoiceId, items);
    return groups;
  }, new Map<string, typeof itemRows>());

  const summaries = invoiceRows.map((invoice) => {
    const totals = calculateInvoiceTotal(
      itemsByInvoice.get(invoice.id) || [],
      invoice,
    );
    return {
      ...invoice,
      ...totals,
      effectiveStatus: effectiveInvoiceStatus(
        invoice.status,
        invoice.dueDate,
        totals.balance,
      ),
    };
  });

  const outstanding = summaries
    .filter((invoice) =>
      ["sent", "overdue"].includes(invoice.effectiveStatus),
    )
    .reduce((sum, invoice) => sum + invoice.balance, 0);
  const overdue = summaries
    .filter((invoice) => invoice.effectiveStatus === "overdue")
    .reduce((sum, invoice) => sum + invoice.balance, 0);
  const paid = summaries
    .filter((invoice) => invoice.effectiveStatus === "paid")
    .reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <AppShell
      active="dashboard"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Business overview</p>
            <h1>Good to see you, {user.fullName?.split(" ")[0] || "there"}.</h1>
            <p>Here is what needs your attention today.</p>
          </div>
          <Link href="/invoices/new" className="button button-primary">
            Create invoice
          </Link>
        </header>

        <section className="dashboard-metrics" aria-label="Revenue summary">
          <article>
            <span>Outstanding</span>
            <strong>{formatMoney(outstanding, account.defaultCurrency)}</strong>
            <small>
              {
                summaries.filter((invoice) =>
                  ["sent", "overdue"].includes(invoice.effectiveStatus),
                ).length
              }{" "}
              active invoices
            </small>
          </article>
          <article>
            <span>Overdue</span>
            <strong>{formatMoney(overdue, account.defaultCurrency)}</strong>
            <small>
              {
                summaries.filter(
                  (invoice) => invoice.effectiveStatus === "overdue",
                ).length
              }{" "}
              need attention
            </small>
          </article>
          <article>
            <span>Paid</span>
            <strong>{formatMoney(paid, account.defaultCurrency)}</strong>
            <small>Across saved invoices</small>
          </article>
          <article>
            <span>Clients</span>
            <strong>{clientRows.length}</strong>
            <small>Saved business relationships</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel recent-invoices">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Receivables</p>
                <h2>Recent invoices</h2>
              </div>
              <Link href="/invoices">View all</Link>
            </div>

            {summaries.length ? (
              <div className="record-list">
                {summaries.slice(0, 5).map((invoice) => (
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="record-row"
                    key={invoice.id}
                  >
                    <span className="record-avatar">
                      {invoice.clientName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="record-main">
                      <strong>{invoice.clientName}</strong>
                      <small>
                        {invoice.number} | Due {formatDate(invoice.dueDate)}
                      </small>
                    </span>
                    <strong>
                      {formatMoney(invoice.balance, invoice.currency)}
                    </strong>
                    <span
                      className={`status status-${invoice.effectiveStatus}`}
                    >
                      {invoice.effectiveStatus}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Your first invoice starts here.</strong>
                <p>
                  Add a client, describe your work, and send a professional
                  invoice in a few minutes.
                </p>
                <Link href="/invoices/new" className="button button-primary">
                  Create first invoice
                </Link>
              </div>
            )}
          </article>

          <aside className="panel quick-start">
            <p className="eyebrow">Quick start</p>
            <h2>Set up your workspace</h2>
            <ol>
              <li className={account.businessName !== "My business" ? "done" : ""}>
                <span>1</span>
                <div>
                  <strong>Add business details</strong>
                  <small>Logo, address, tax number, and currency</small>
                </div>
              </li>
              <li className={clientRows.length ? "done" : ""}>
                <span>2</span>
                <div>
                  <strong>Add your first client</strong>
                  <small>Keep billing details ready for future work</small>
                </div>
              </li>
              <li className={invoiceRows.length ? "done" : ""}>
                <span>3</span>
                <div>
                  <strong>Create an invoice</strong>
                  <small>Add services, tax, terms, and a due date</small>
                </div>
              </li>
            </ol>
            <Link href="/settings" className="text-link">
              Complete business profile
            </Link>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}
