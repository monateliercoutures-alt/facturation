import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Montants en FCFA : entiers, sans décimales. bigint en mode number (sûr jusqu'à 9 × 10^15). */
const money = (name: string) => bigint(name, { mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const plan = pgEnum("plan", ["free", "pro", "business"]);
export const documentType = pgEnum("document_type", ["FAC", "DEV", "BL"]);
export const documentStatus = pgEnum("document_status", [
  "draft",
  "sent",
  "partial",
  "paid",
  "overdue",
  "cancelled",
  "delivered",
]);
export const paymentRequestStatus = pgEnum("payment_request_status", ["pending", "validated", "rejected"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Numéro normalisé au format international : +2250700000000. */
  phone: text("phone").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("user"),
  plan: plan("plan").notNull().default("free"),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Numéros Mobile Money affichés sur les documents. */
export type PaymentNumbers = {
  wave?: string;
  orangeMoney?: string;
  mtnMoney?: string;
  moovMoney?: string;
};

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Image redimensionnée (240 px max) stockée en data URL. */
    logo: text("logo"),
    rccm: text("rccm"),
    taxNumber: text("tax_number"),
    address: text("address"),
    phone: text("phone"),
    paymentNumbers: jsonb("payment_numbers").$type<PaymentNumbers>().notNull().default({}),
    defaultNote: text("default_note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("companies_user_id_key").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    createdAt: createdAt(),
  },
  (t) => [index("clients_user_id_idx").on(t.userId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    type: documentType("type").notNull(),
    number: text("number").notNull(),
    status: documentStatus("status").notNull().default("draft"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    vatPercent: integer("vat_percent").notNull().default(0),
    subtotal: money("subtotal").notNull().default(0),
    discountAmount: money("discount_amount").notNull().default(0),
    vatAmount: money("vat_amount").notNull().default(0),
    total: money("total").notNull().default(0),
    note: text("note"),
    paymentMethods: text("payment_methods").array().notNull().default(sql`'{}'::text[]`),
    deliveryAddress: text("delivery_address"),
    deliveredBy: text("delivered_by"),
    sourceDocumentId: uuid("source_document_id"),
    shareToken: text("share_token").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("documents_user_type_number_key").on(t.userId, t.type, t.number),
    index("documents_user_id_idx").on(t.userId),
    index("documents_client_id_idx").on(t.clientId),
  ],
);

export const documentItems = pgTable(
  "document_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2, mode: "number" }).notNull().default(1),
    unitPrice: money("unit_price").notNull().default(0),
  },
  (t) => [index("document_items_document_id_idx").on(t.documentId)],
);

export const installments = pgTable(
  "installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** Acompte, Tranche 2, Solde, Paiement comptant. */
    label: text("label").notNull(),
    amount: money("amount").notNull(),
    dueDate: date("due_date"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    method: text("method"),
  },
  (t) => [index("installments_document_id_idx").on(t.documentId)],
);

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: plan("plan").notNull(),
    amount: money("amount").notNull(),
    reference: text("reference").notNull(),
    status: paymentRequestStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
  },
  (t) => [index("payment_requests_user_id_idx").on(t.userId)],
);

export const counters = pgTable(
  "counters",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: documentType("type").notNull(),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.type, t.year] })],
);

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type DocumentType = (typeof documentType.enumValues)[number];
