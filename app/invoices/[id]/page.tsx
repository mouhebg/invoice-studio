import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { AppShell } from "../../components/AppShell";
import { InvoiceActions } from "../../components/InvoiceActions";
import {
  ensureAccount,
  getInvoice,
} from "../../../db/queries";
import { calculateInvoiceTotal } from "../../../lib/invoice-math";
import {
  effectiveInvoiceStatus,
  formatDate,
  formatMoney,
} from "../../../lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/invoices/${id}`);
  const account = await ensureAccount({
    email: user.email,
    name: user.fullName,
  });
  const record = await getInvoice(account.id, id);
  if (!record || !record.client) notFound();

  const totals = calculateInvoiceTotal(record.items, record.invoice);
  const status = effectiveInvoiceStatus(
    record.invoice.status,
    record.invoice.dueDate,
    totals.balance,
  );

  return (
    <AppShell
      active="invoices"
      user={user}
      businessName={account.businessName}
    >
      <main className="app-content invoice-detail-page">
        <header className="page-header invoice-screen-header">
          <div>
            <p className="eyebrow">Client document</p>
            <h1>{record.invoice.number}</h1>
            <p>
              {record.client.name} | {formatMoney(totals.balance, record.invoice.currency)} due
            </p>
          </div>
          <InvoiceActions
            invoiceId={record.invoice.id}
            status={record.invoice.status}
          />
        </header>

        <article className="print-invoice">
          <header className="print-invoice-head">
            <div>
              <p className="eyebrow">Invoice</p>
              <h2>{account.businessName}</h2>
              <p>{account.businessEmail}</p>
            </div>
            <div className="invoice-number-box">
              <span>Invoice number</span>
              <strong>{record.invoice.number}</strong>
              <small className={`status status-${status}`}>{status}</small>
            </div>
          </header>

          <section className="invoice-date-grid">
            <div>
              <span>Issued</span>
              <strong>{formatDate(record.invoice.issueDate)}</strong>
            </div>
            <div>
              <span>Due</span>
              <strong>{formatDate(record.invoice.dueDate)}</strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>{record.invoice.currency}</strong>
            </div>
            <div>
              <span>Balance due</span>
              <strong>
                {formatMoney(totals.balance, record.invoice.currency)}
              </strong>
            </div>
          </section>

          <section className="invoice-addresses">
            <div>
              <p className="eyebrow">From</p>
              <strong>{account.businessName}</strong>
              <p>{account.address || "Business address not added"}</p>
              <p>{account.businessEmail}</p>
              {account.taxNumber ? <p>Registration: {account.taxNumber}</p> : null}
            </div>
            <div>
              <p className="eyebrow">Bill to</p>
              <strong>{record.client.name}</strong>
              <p>{record.client.contactName}</p>
              <p>{record.client.address}</p>
              <p>{record.client.email}</p>
            </div>
          </section>

          <section className="print-line-items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.rate, record.invoice.currency)}</td>
                    <td>
                      {formatMoney(
                        item.quantity * item.rate,
                        record.invoice.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="invoice-closing">
            <div>
              {record.invoice.paymentInstructions ? (
                <>
                  <p className="eyebrow">Payment instructions</p>
                  <p>{record.invoice.paymentInstructions}</p>
                </>
              ) : null}
              {record.invoice.notes ? (
                <>
                  <p className="eyebrow">Notes and terms</p>
                  <p>{record.invoice.notes}</p>
                </>
              ) : null}
            </div>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(totals.subtotal, record.invoice.currency)}</dd>
              </div>
              {totals.discount ? (
                <div>
                  <dt>Discount</dt>
                  <dd>
                    {formatMoney(totals.discount, record.invoice.currency)}
                  </dd>
                </div>
              ) : null}
              {totals.tax ? (
                <div>
                  <dt>
                    {record.invoice.taxLabel} ({record.invoice.taxRate}%)
                  </dt>
                  <dd>{formatMoney(totals.tax, record.invoice.currency)}</dd>
                </div>
              ) : null}
              <div className="invoice-total">
                <dt>Balance due</dt>
                <dd>{formatMoney(totals.balance, record.invoice.currency)}</dd>
              </div>
            </dl>
          </section>

          <footer className="print-invoice-footer">
            <strong>{account.businessName}</strong>
            <p>Thank you for your business.</p>
          </footer>
        </article>
      </main>
    </AppShell>
  );
}
