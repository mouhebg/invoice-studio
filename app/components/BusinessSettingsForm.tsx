"use client";

import { useState } from "react";

type Account = {
  businessName: string;
  businessEmail: string;
  phone: string;
  address: string;
  taxNumber: string;
  defaultCurrency: string;
};

export function BusinessSettingsForm({ account }: { account: Account }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    setMessage(
      response.ok
        ? "Business profile saved."
        : result.error || "The profile could not be saved.",
    );
  }

  return (
    <form action={submit} className="settings-form">
      <section className="panel form-section">
        <div className="form-section-heading">
          <p className="eyebrow">Business identity</p>
          <h2>Information shown on invoices</h2>
          <p>
            Use your legal or professional business details so clients know
            exactly who issued the invoice.
          </p>
        </div>
        <div className="form-grid">
          <label className="field field-wide">
            <span>Business or professional name</span>
            <input
              name="businessName"
              defaultValue={account.businessName}
              required
            />
          </label>
          <label className="field">
            <span>Business email</span>
            <input
              name="businessEmail"
              type="email"
              defaultValue={account.businessEmail}
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" type="tel" defaultValue={account.phone} />
          </label>
          <label className="field">
            <span>Tax or registration number</span>
            <input name="taxNumber" defaultValue={account.taxNumber} />
          </label>
          <label className="field">
            <span>Default currency</span>
            <select name="defaultCurrency" defaultValue={account.defaultCurrency}>
              <option value="CAD">CAD, Canadian dollar</option>
              <option value="USD">USD, US dollar</option>
              <option value="EUR">EUR, euro</option>
              <option value="GBP">GBP, pound sterling</option>
              <option value="TND">TND, Tunisian dinar</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>Business address</span>
            <textarea
              name="address"
              rows={4}
              defaultValue={account.address}
            />
          </label>
        </div>
      </section>
      <div className="settings-actions">
        <p role="status">{message}</p>
        <button
          type="submit"
          className="button button-primary"
          disabled={saving}
        >
          {saving ? "Saving" : "Save business profile"}
        </button>
      </div>
    </form>
  );
}
