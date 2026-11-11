import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

// Append-only, hash-chained audit log (spec §6.11). Metrics are derived from these rows, never from counters.
export const auditLog = pgTable("audit_log", {
  seq: integer("seq").primaryKey(),
  ts: timestamp("ts", { withTimezone: true, mode: "date" }).notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  subject: text("subject").notNull(),
  codes: jsonb("codes").$type<string[]>().notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  prevHash: text("prev_hash").notNull(),
  hash: text("hash").notNull(),
  origPayload: jsonb("orig_payload").$type<Record<string, unknown> | null>(),
});

// Simulated respondents (SIMULATION ONLY).
export const personas = pgTable("personas", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(), // v1 | v2
  personaId: text("persona_id"),
  source: text("source").notNull(), // simulated | real
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicant: text("applicant").notNull(),
  listingId: text("listing_id").notNull(),
  status: text("status").notNull(), // SUBMITTED | DECLINED | WITHDRAWN
  position: integer("position"),
  total: integer("total"),
  code: text("code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sublets = pgTable("sublets", {
  id: serial("id").primaryKey(),
  headTenant: text("head_tenant").notNull(),
  room: text("room").notNull(),
  headRent: integer("head_rent").notNull(),
  subletRent: integer("sublet_rent").notNull(),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  consent: text("consent").notNull(), // AWAITING | GRANTED | REFUSED
  status: text("status").notNull(), // AWAITING_CONSENT | LIVE | FILLED
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
