import assert from "node:assert/strict";
import test from "node:test";
import { buildTransactionWhere, toCsv } from "./finance.service.js";
import { financeFiltersDto } from "../dtos/finance.dto.js";

test("filtro por ano inclui todos os meses e preserva isolamento do usuario", () => {
  const where = buildTransactionWhere("user-1", { year: 2025 });
  assert.equal(where.userId, "user-1");
  assert.deepEqual(where.AND, [{ date: { gte: new Date("2025-01-01"), lt: new Date("2026-01-01") } }]);
});

test("filtro de dezembro termina em janeiro do ano seguinte", () => {
  const where = buildTransactionWhere("user-1", { month: 12, year: 2025 });
  assert.deepEqual(where.AND, [{ date: { gte: new Date("2025-12-01"), lt: new Date("2026-01-01") } }]);
});

test("sem periodo o historico nao aplica restricao de data", () => {
  assert.equal(buildTransactionWhere("user-1", {}).AND, undefined);
});

test("validacao rejeita periodos e faixas de valor invalidos", () => {
  for (const filters of [{ month: 1.5 }, { year: 2025.5 }, { year: 2201 }, { minAmount: 100, maxAmount: 50 }, { from: "2026-02-01", to: "2026-01-01" }]) {
    assert.equal(financeFiltersDto.safeParse(filters).success, false);
  }
  assert.equal(financeFiltersDto.safeParse({ year: 2025, minAmount: 0, maxAmount: 100 }).success, true);
});

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

test("toCsv neutraliza formulas interpretadas por planilhas", () => {
  const csv = toCsv([{ descricao: "=HYPERLINK(\"https://example.com\")" }]);

  assert.equal(csv, 'descricao\n"\'=HYPERLINK(""https://example.com"")"');
});
