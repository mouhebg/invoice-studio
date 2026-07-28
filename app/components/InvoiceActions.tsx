"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updateStatus(nextStatus: string) {
    setSaving(true);
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="invoice-actions">
      <label>
        <span>Status</span>
        <select
          value={status}
          disabled={saving}
          onChange={(event) => updateStatus(event.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </label>
      <button
        type="button"
        className="button button-primary"
        onClick={() => window.print()}
      >
        Print or save PDF
      </button>
    </div>
  );
}
