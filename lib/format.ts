export function formatMoney(value: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "TND" ? 3 : 2,
    maximumFractionDigits: currency === "TND" ? 3 : 2,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function todayIso() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

export function effectiveInvoiceStatus(
  status: string,
  dueDate: string,
  balance: number,
) {
  if (status === "paid" || balance === 0) return "paid";
  if (status === "draft") return "draft";
  if (dueDate < todayIso()) return "overdue";
  return "sent";
}
