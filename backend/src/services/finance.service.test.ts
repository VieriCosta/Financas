import assert from "node:assert/strict";
import test from "node:test";
import { buildTransactionWhere, toCsv } from "./finance.service.js";

test("buildTransactionWhere aplica filtros de usuario, mes e busca", () => {
  const where = buildTransactionWhere("user-1", {
    month: 5,
    year: 2026,
    type: "EXPENSE",
    search: "mercado"
  });

  assert.equal(where.userId, "user-1");
  assert.equal(where.type, "EXPENSE");
  assert.ok(where.AND);
  assert.equal(where.AND?.length, 2);
});

test("toCsv escapa campos com virgula e aspas", () => {
  const csv = toCsv([
    { descricao: 'Mercado "Centro"', valor: 120.5, categoria: "Casa, compras" }
  ]);

  assert.equal(csv, 'descricao,valor,categoria\n"Mercado ""Centro""",120.5,"Casa, compras"');
});
