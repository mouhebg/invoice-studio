const numberValue = (input) => {
  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
};

const formatter = (currency) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function initializeInvoiceDemo(form) {
  const fields = {
    description: form.querySelector("#service-description"),
    quantity: form.querySelector("#service-quantity"),
    rate: form.querySelector("#service-rate"),
    currency: form.querySelector("#invoice-currency"),
    tax: form.querySelector("#invoice-tax"),
  };

  const output = {
    description: document.querySelector("#live-description"),
    quantity: document.querySelector("#live-quantity"),
    rate: document.querySelector("#live-rate"),
    lineTotal: document.querySelector("#live-line-total"),
    subtotal: document.querySelector("#live-subtotal"),
    taxLabel: document.querySelector("#live-tax-label"),
    taxTotal: document.querySelector("#live-tax-total"),
    total: document.querySelector("#live-total"),
    status: document.querySelector("#live-status"),
  };

  const render = () => {
    const quantity = numberValue(fields.quantity);
    const rate = numberValue(fields.rate);
    const taxRate = numberValue(fields.tax);
    const subtotal = quantity * rate;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const money = formatter(fields.currency.value);
    const selectedStatus = form.querySelector(
      'input[name="status"]:checked',
    )?.value;

    output.description.textContent =
      fields.description.value.trim() || "Professional service";
    output.quantity.textContent = quantity.toLocaleString("en-CA");
    output.rate.textContent = money.format(rate);
    output.lineTotal.textContent = money.format(subtotal);
    output.subtotal.textContent = money.format(subtotal);
    output.taxLabel.textContent = taxRate ? `Tax · ${taxRate}%` : "Tax";
    output.taxTotal.textContent = money.format(tax);
    output.total.textContent = money.format(total);
    output.status.textContent = selectedStatus ?? "Draft";
    output.status.dataset.status = selectedStatus ?? "Draft";
  };

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
}
