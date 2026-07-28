import Link from "next/link";
import { requireUser } from "../auth";
import { AppShell } from "../components/AppShell";
import {
  ensureAccount,
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

export default async function InvoicesPage() {
  const user = await requireUser("/invoices");
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const invoiceRows = await getInvoices(account.id);
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

  return (
    <AppShell
      active="invoices"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue records</p>
            <h1>Invoices</h1>
            <p>Track draft, sent, overdue, and paid client work.</p>
          </div>
          <Link href="/invoices/new" className="button button-primary">
            Create invoice
          </Link>
        </header>

        <section className="panel">
          {summaries.length ? (
            <div className="invoice-table">
              <div className="invoice-table-head">
                <span>Invoice</span>
                <span>Client</span>
                <span>Due date</span>
                <span>Status</span>
                <span>Balance</span>
              </div>
              {summaries.map((invoice) => (
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="invoice-table-row"
                  key={invoice.id}
                >
                  <span>
                    <strong>{invoice.number}</strong>
                    <small>Issued {formatDate(invoice.issueDate)}</small>
                  </span>
                  <span>{invoice.clientName}</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                  <span
                    className={`status status-${invoice.effectiveStatus}`}
                  >
                    {invoice.effectiveStatus}
                  </span>
                  <strong>
                    {formatMoney(invoice.balance, invoice.currency)}
                  </strong>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No invoices yet.</strong>
              <p>
                Create your first invoice to begin tracking outstanding and
                paid work.
              </p>
              <Link href="/invoices/new" className="button button-primary">
                Create first invoice
              </Link>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
