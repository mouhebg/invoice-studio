import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvoiceTotal } from "../lib/invoice-math.ts";

test("calculates subtotal, discount, tax, and balance", () => {
  const result = calculateInvoiceTotal(
    [
      { quantity: 2, rate: 125 },
      { quantity: 1.5, rate: 80 },
    ],
    {
      discount: 20,
      taxEnabled: true,
      taxRate: 13,
      amountPaid: 50,
    },
  );

  assert.equal(result.subtotal, 370);
  assert.equal(result.discount, 20);
  assert.equal(result.tax, 45.5);
  assert.equal(result.total, 395.5);
  assert.equal(result.balance, 345.5);
});

test("caps discounts and payments at a zero balance", () => {
  const result = calculateInvoiceTotal(
    [{ quantity: 1, rate: 100 }],
    {
      discount: 200,
      taxEnabled: false,
      taxRate: 13,
      amountPaid: 300,
    },
  );

  assert.deepEqual(result, {
    subtotal: 100,
    discount: 100,
    tax: 0,
    total: 0,
    balance: 0,
  });
});

test("does not allow negative line values", () => {
  const result = calculateInvoiceTotal(
    [{ quantity: -2, rate: 100 }],
    {
      discount: -10,
      taxEnabled: false,
      taxRate: 0,
      amountPaid: -50,
    },
  );

  assert.equal(result.subtotal, 0);
  assert.equal(result.balance, 0);
});
