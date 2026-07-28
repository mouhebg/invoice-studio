import { requireChatGPTUser } from "../../chatgpt-auth";
import { AppShell } from "../../components/AppShell";
import { InvoiceForm } from "../../components/InvoiceForm";
import {
  ensureAccount,
  getClients,
  getInvoices,
} from "../../../db/queries";
import { todayIso } from "../../../lib/format";

export const dynamic = "force-dynamic";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function NewInvoicePage() {
  const user = await requireChatGPTUser("/invoices/new");
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const [clientRows, invoiceRows] = await Promise.all([
    getClients(account.id),
    getInvoices(account.id),
  ]);
  const year = new Date().getFullYear();
  const sequence =
    Math.max(
      0,
      ...invoiceRows
        .map((invoice) =>
          invoice.number.match(new RegExp(`^INV-${year}-(\\d+)$`)),
        )
        .filter(Boolean)
        .map((match) => Number(match?.[1] || 0)),
    ) + 1;
  const invoiceNumber = `INV-${year}-${String(sequence).padStart(3, "0")}`;
  const issueDate = todayIso();

  return (
    <AppShell
      active="invoices"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">New receivable</p>
            <h1>Create an invoice</h1>
            <p>Build a clear client document and save it to your account.</p>
          </div>
        </header>
        <InvoiceForm
          clients={clientRows}
          currency={account.defaultCurrency}
          invoiceNumber={invoiceNumber}
          issueDate={issueDate}
          dueDate={addDays(issueDate, 30)}
        />
      </main>
    </AppShell>
  );
}
