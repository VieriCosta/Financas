import assert from "node:assert/strict";
import test from "node:test";
import { purchaseSchedule, invoiceDueDate, ensureAccount } from "./ledger.service.js";
import { transferDto, paymentDto } from "../dtos/ledger.dto.js";
import { Prisma } from "@prisma/client";

test("compra no fechamento vai para proxima fatura e preserva centavos", () => {
  const schedule = purchaseSchedule(new Date("2026-12-20"), 20, 100, 3);
  assert.deepEqual(schedule.map(item => item.invoiceMonth), ["2027-01", "2027-02", "2027-03"]);
  assert.deepEqual(schedule.map(item => item.amount), [33.33, 33.33, 33.34]);
  assert.equal(purchaseSchedule(new Date("2026-12-19"), 20, 10, 1)[0].invoiceMonth, "2026-12");
});
test("vencimento e ajustado ao calendario e ao fechamento", () => {
  assert.equal(invoiceDueDate("2026-01", 20, 10).toISOString().slice(0, 10), "2026-02-10");
  assert.equal(invoiceDueDate("2026-02", 20, 31).toISOString().slice(0, 10), "2026-02-28");
});
test("transferencia rejeita mesma conta e pagamento rejeita fracao de centavo", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(transferDto.safeParse({ fromAccountId: id, toAccountId: id, amount: 10, date: "2026-01-01" }).success, false);
  assert.equal(paymentDto.safeParse({ accountId: id, amount: 1.001, invoiceMonth: "2026-01", date: "2026-01-01" }).success, false);
});
test("conta ausente ou de outro usuario bloqueia lancamento", async () => {
  let where: unknown;
  const db = { account: { findFirst: async (input: unknown) => { where = input; return null; } } };
  await assert.rejects(ensureAccount("owner", "foreign", db as unknown as Prisma.TransactionClient), /Conta invalida/);
  assert.deepEqual(where, { where: { id: "foreign", userId: "owner", archived: false } });
});
