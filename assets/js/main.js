import { initializeInvoiceDemo } from "./invoice-demo.js";

const invoiceControls = document.querySelector("#invoice-controls");

if (invoiceControls instanceof HTMLFormElement) {
  initializeInvoiceDemo(invoiceControls);
}
