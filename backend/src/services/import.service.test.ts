import assert from "node:assert/strict";
import test from "node:test";
import { csvRows, parseStatement, importKey } from "./import.service.js";

test("CSV trata aspas, linhas dentro de campos e valores brasileiros", () => {
  assert.deepEqual(
    csvRows('data;descricao;valor\r\n01/10/2026;"Mercado; centro";-12,50'),
    [
      ["data", "descricao", "valor"],
      ["01/10/2026", "Mercado; centro", "-12,50"],
    ],
  );
  const rows = parseStatement(
    "data;descricao;valor\n01/10/2026;Mercado;-1.234,50",
    "CSV",
  );
  assert.equal(rows[0].amount, 1234.5);
  assert.equal(rows[0].type, "EXPENSE");
  assert.equal(rows[0].date.toISOString().slice(0, 10), "2026-10-01");
  assert.deepEqual(csvRows('"a\nb",c\n"d""e",f'), [
    ["a\nb", "c"],
    ['d"e', "f"],
  ]);
});
test("CSV exportado pode voltar com tipo explicito e cabecalhos mapeados", () => {
  const rows = parseStatement(
    "descricao,valor,tipo,data\nSalario,5000,Receita,2026-10-01",
    "CSV",
    { description: 0, amount: 1, type: 2, date: 3 },
  );
  assert.equal(rows[0].type, "INCOME");
});
test("OFX aceita SGML e identifica data, sinal e FITID", () => {
  const rows = parseStatement(
    "<OFX><STMTTRN><DTPOSTED>20261001120000[-3:BRT]\n<TRNAMT>-12.50\n<FITID>bank-123\n<NAME>Mercado\n</STMTTRN></OFX>",
    "OFX",
  );
  assert.equal(rows[0].externalId, "bank-123");
  assert.equal(rows[0].amount, 12.5);
  assert.equal(rows[0].type, "EXPENSE");
});
test("extrato invalido nao cria preview e chaves isolam contas", () => {
  assert.throws(() =>
    parseStatement("data,descricao,valor\n2026-02-31,Mercado,10", "CSV"),
  );
  assert.throws(() => csvRows('"incompleto'));
  const row = parseStatement(
    "data,descricao,valor\n2026-10-01,Mercado,-10",
    "CSV",
  )[0];
  assert.notEqual(importKey("one", row), importKey("two", row));
  assert.equal(importKey("one", row), importKey("one", { ...row }));
});

test("identificadores do banco distinguem compras iguais e permanecem estaveis", () => {
  const row = parseStatement(
    "data,descricao,valor\n2026-10-01,Mercado,-10",
    "CSV",
  )[0];
  assert.notEqual(
    importKey("account", { ...row, externalId: "bank-1" }),
    importKey("account", { ...row, externalId: "bank-2" }),
  );
  assert.equal(
    importKey("account", { ...row, externalId: "bank-1" }),
    importKey("account", {
      ...row,
      description: "Descricao atualizada",
      externalId: "bank-1",
    }),
  );
});
