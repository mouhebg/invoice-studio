"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(result.error || "The client could not be saved.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={() => setOpen(true)}
      >
        Add client
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-client-title"
          >
            <header>
              <div>
                <p className="eyebrow">New business relationship</p>
                <h2 id="new-client-title">Add a client</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>
            <form action={submit} className="form-grid">
              <label className="field field-wide">
                <span>Client or company name</span>
                <input name="name" required autoFocus />
              </label>
              <label className="field">
                <span>Contact person</span>
                <input name="contactName" />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" />
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="phone" type="tel" />
              </label>
              <label className="field field-wide">
                <span>Billing address</span>
                <textarea name="address" rows={3} />
              </label>
              <label className="field field-wide">
                <span>Internal notes</span>
                <textarea name="notes" rows={3} />
              </label>
              {message ? <p className="form-error">{message}</p> : null}
              <div className="form-actions field-wide">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? "Saving" : "Save client"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
