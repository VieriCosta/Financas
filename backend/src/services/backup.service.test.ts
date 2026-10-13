import assert from "node:assert/strict";
import test from "node:test";
import { backupModels, validateBackup } from "./backup.service.js";

function blank() { return { version: 1, exportedAt: "2026-10-13", tables: Object.fromEntries(backupModels.map(model => [model, []])) }; }
test("backup rejeita versao desconhecida e campos de autenticacao", () => {
  assert.throws(() => validateBackup({ ...blank(), version: 2 }));
  assert.throws(() => validateBackup({ ...blank(), passwordHash: "secret" }));
  assert.doesNotThrow(() => validateBackup(blank()));
});
test("backup rejeita relacoes externas e valores financeiros invalidos", () => {
  const backup = blank();
  const row = { id: "00000000-0000-4000-8000-000000000001", description: "Despesa", amount: 10, type: "EXPENSE", date: "2026-10-13", accountId: "00000000-0000-4000-8000-000000000002" };
  backup.tables.Transaction = [row] as never[];
  assert.throws(() => validateBackup(backup), /Referencia invalida/);
  backup.tables.Transaction = [{ ...row, accountId: null, amount: -10 }] as never[];
  assert.throws(() => validateBackup(backup));
});
