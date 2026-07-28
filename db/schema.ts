import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    ownerName: text("owner_name"),
    businessName: text("business_name").notNull().default("My business"),
    businessEmail: text("business_email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    taxNumber: text("tax_number").notNull().default(""),
    defaultCurrency: text("default_currency").notNull().default("CAD"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("accounts_owner_email_idx").on(table.ownerEmail),
  ],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("clients_account_id_idx").on(table.accountId)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    number: text("number").notNull(),
    status: text("status", {
      enum: ["draft", "sent", "paid", "overdue"],
    })
      .notNull()
      .default("draft"),
    currency: text("currency").notNull().default("CAD"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    discount: real("discount").notNull().default(0),
    amountPaid: real("amount_paid").notNull().default(0),
    taxEnabled: integer("tax_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    taxLabel: text("tax_label").notNull().default("HST"),
    taxRate: real("tax_rate").notNull().default(13),
    notes: text("notes").notNull().default(""),
    paymentInstructions: text("payment_instructions").notNull().default(""),
    recurringCadence: text("recurring_cadence"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("invoices_account_number_idx").on(
      table.accountId,
      table.number,
    ),
    index("invoices_account_id_idx").on(table.accountId),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_due_date_idx").on(table.dueDate),
  ],
);

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: real("quantity").notNull().default(1),
    rate: real("rate").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)],
);
