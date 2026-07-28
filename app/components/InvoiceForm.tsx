"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatMoney } from "../../lib/format";

type Client = {
  id: string;
  name: string;
};

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

type InvoiceFormProps = {
  clients: Client[];
  currency: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
};

export function InvoiceForm({
  clients,
  currency: initialCurrency,
  invoiceNumber,
  issueDate,
  dueDate,
}: InvoiceFormProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialCurrency);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(13);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "item-1",
      description: "",
      quantity: 1,
      rate: 0,
    },
  ]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0,
    );
    const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
    const taxable = subtotal - appliedDiscount;
    const tax = taxEnabled ? taxable * Math.max(taxRate, 0) / 100 : 0;
    return {
      subtotal,
      discount: appliedDiscount,
      tax,
      total: taxable + tax,
    };
  }, [discount, items, taxEnabled, taxRate]);

  function updateItem(
    id: string,
    field: "description" | "quantity" | "rate",
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "description"
                  ? value
                  : Math.max(Number(value) || 0, 0),
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        rate: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item.id !== id),
    );
  }

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const payload = {
      ...Object.fromEntries(formData),
      discount,
      taxEnabled,
      taxRate,
      items: items.map(({ description, quantity, rate }) => ({
        description,
        quantity,
        rate,
      })),
    };
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      error?: string;
      invoice?: { id: string };
    };
    setSaving(false);

    if (!response.ok || !result.invoice) {
      setMessage(result.error || "The invoice could not be created.");
      return;
    }
    router.push(`/invoices/${result.invoice.id}`);
  }

  return (
    <form action={submit} className="invoice-builder">
      <div className="invoice-builder-main">
        <section className="panel form-section">
          <div className="form-section-heading">
            <p className="eyebrow">Invoice details</p>
            <h2>Client and dates</h2>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Client</span>
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  Select a client
                </option>
                {clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Invoice number</span>
              <input name="number" defaultValue={invoiceNumber} required />
            </label>
            <label className="field">
              <span>Currency</span>
              <select
                name="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="TND">TND</option>
              </select>
            </label>
            <label className="field">
              <span>Issue date</span>
              <input
                name="issueDate"
                type="date"
                defaultValue={issueDate}
                required
              />
            </label>
            <label className="field">
              <span>Due date</span>
              <input
                name="dueDate"
                type="date"
                defaultValue={dueDate}
                required
              />
            </label>
          </div>
        </section>

        <section className="panel form-section">
          <div className="form-section-heading">
            <p className="eyebrow">Work and fees</p>
            <h2>Line items</h2>
          </div>
          <div className="line-items">
            {items.map((item, index) => (
              <fieldset className="line-item" key={item.id}>
                <legend>Line item {index + 1}</legend>
                <label className="field line-description">
                  <span>Description</span>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(event) =>
                      updateItem(item.id, "description", event.target.value)
                    }
                    placeholder="Service, project, or expense"
                    required
                  />
                </label>
                <label className="field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.id, "quantity", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Rate</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(event) =>
                      updateItem(item.id, "rate", event.target.value)
                    }
                  />
                </label>
                <div className="line-total">
                  <span>Amount</span>
                  <strong>
                    {formatMoney(item.quantity * item.rate, currency)}
                  </strong>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeItem(item.id)}
                  hidden={items.length === 1}
                >
                  Remove
                </button>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            className="button button-secondary add-line"
            onClick={addItem}
          >
            Add another item
          </button>
        </section>

        <section className="panel form-section">
          <div className="form-section-heading">
            <p className="eyebrow">Payment</p>
            <h2>Tax, terms, and notes</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(Math.max(Number(event.target.value) || 0, 0))
                }
              />
            </label>
            <label className="field">
              <span>Tax rate</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                disabled={!taxEnabled}
                onChange={(event) =>
                  setTaxRate(Math.max(Number(event.target.value) || 0, 0))
                }
              />
            </label>
            <label className="toggle-field field-wide">
              <span>
                <strong>Apply tax</strong>
                <small>Enable this only when your business charges tax.</small>
              </span>
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(event) => setTaxEnabled(event.target.checked)}
              />
            </label>
            <label className="field field-wide">
              <span>Payment instructions</span>
              <textarea
                name="paymentInstructions"
                rows={3}
                placeholder="Example: Please pay by e-transfer to billing@example.com."
              />
            </label>
            <label className="field field-wide">
              <span>Notes and terms</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Example: Thank you for your business. Payment is due within 30 days."
              />
            </label>
            <label className="field">
              <span>Repeat invoice</span>
              <select name="recurringCadence" defaultValue="">
                <option value="">Do not repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Every three months</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="invoice-summary panel">
        <p className="eyebrow">Invoice summary</p>
        <h2>{invoiceNumber}</h2>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(totals.subtotal, currency)}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{formatMoney(totals.discount, currency)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{formatMoney(totals.tax, currency)}</dd>
          </div>
          <div className="summary-total">
            <dt>Total</dt>
            <dd>{formatMoney(totals.total, currency)}</dd>
          </div>
        </dl>
        {message ? <p className="form-error">{message}</p> : null}
        <button
          type="submit"
          className="button button-primary"
          disabled={saving || !clients.length}
        >
          {saving ? "Creating invoice" : "Create invoice"}
        </button>
        {!clients.length ? (
          <p className="summary-note">
            Add a client before creating an invoice.
          </p>
        ) : null}
      </aside>
    </form>
  );
}
