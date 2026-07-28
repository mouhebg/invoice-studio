export type InvoiceMathInput = {
  discount: number;
  taxEnabled: boolean;
  taxRate: number;
  amountPaid: number;
};

export type InvoiceMathItem = {
  quantity: number;
  rate: number;
};

export function calculateInvoiceTotal(
  items: InvoiceMathItem[],
  invoice: InvoiceMathInput,
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Math.max(item.quantity, 0) * Math.max(item.rate, 0),
    0,
  );
  const discount = Math.min(Math.max(invoice.discount, 0), subtotal);
  const taxable = subtotal - discount;
  const tax = invoice.taxEnabled
    ? taxable * Math.max(invoice.taxRate, 0) / 100
    : 0;
  const total = taxable + tax;
  const balance = Math.max(0, total - Math.max(invoice.amountPaid, 0));

  return { subtotal, discount, tax, total, balance };
}
