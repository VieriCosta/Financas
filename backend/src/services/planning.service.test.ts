import assert from "node:assert/strict";
import test from "node:test";
import { addMonths, addFrequency, createInstallments } from "./planning.service.js";
import { Prisma } from "@prisma/client";

test("recorrencia limita janeiro ao ultimo dia de fevereiro sem pular mes", () => {
  assert.equal(addMonths(new Date("2026-01-31"), 1).getUTCDate(), 28);
  assert.equal(addMonths(new Date("2024-01-31"), 1).getUTCDate(), 29);
  assert.equal(addFrequency(new Date("2024-02-29"), "YEARLY", 1).getUTCMonth(), 1);
  assert.equal(addFrequency(new Date("2026-02-28"), "MONTHLY", 1, 31).toISOString().slice(0, 10), "2026-03-31");
});

test("parcelas preservam centavos e calendario", async () => {
  const rows: Array<Record<string, unknown>> = [];
  const db = { transaction: { create: async ({ data }: { data: Record<string, unknown> }) => { rows.push(data); return data; } } };
  await createInstallments("owner", { description: "Compra", totalAmount: 100, installments: 3, firstDate: new Date("2026-01-31") }, db as unknown as Prisma.TransactionClient);
  assert.deepEqual(rows.map((row) => row.amount), [33.33, 33.33, 33.34]);
  assert.deepEqual(rows.map((row) => (row.date as Date).getUTCMonth()), [0, 1, 2]);
  assert.ok(rows.every((row) => row.userId === "owner"));
});

test("parcelas rejeitam categoria de outro usuario antes de gravar", async () => {
  const db = { category: { findFirst: async () => null } };
  await assert.rejects(createInstallments("owner", { description: "Compra", totalAmount: 100, installments: 3, firstDate: new Date(), categoryId: "foreign" }, db as unknown as Prisma.TransactionClient), /Categoria invalida/);
});
