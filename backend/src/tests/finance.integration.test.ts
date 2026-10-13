import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "../app.js";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { confirmFinancialCommand } from "../services/ai.service.js";
import { ensureRecurringEntries } from "../services/planning.service.js";

test("fluxos completos preservam saldos, isolamento e restauracao", { skip: !process.env.TEST_DATABASE_URL, timeout: 120000 }, async () => {
  assert.equal(env.DATABASE_URL, process.env.TEST_DATABASE_URL, "Use somente o banco de teste explicitamente informado.");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const users: string[] = [];
  type Session = { cookie: string; csrf: string; userId: string };
  async function request(path: string, session?: Session, method = "GET", body?: unknown, status = 200) {
    const response = await fetch(base + path, { method, headers: { ...(session ? { Cookie: session.cookie, "X-CSRF-Token": session.csrf } : {}), "Content-Type": "application/json" }, body: body == null ? undefined : JSON.stringify(body) });
    const text = await response.text(); assert.equal(response.status, status, `${method} ${path}: ${text}`);
    return text ? JSON.parse(text) : null;
  }
  async function register(): Promise<Session> {
    const email = `integration-${randomUUID()}@example.test`;
    const response = await fetch(base + "/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Teste Integracao", email, password: "Test-finance-123!" }) });
    assert.equal(response.status, 201); const result = await response.json(); users.push(result.user.id);
    return { userId: result.user.id, csrf: result.csrfToken, cookie: response.headers.getSetCookie().map(item => item.split(";")[0]).join("; ") };
  }
  try {
    await request("/accounts", undefined, "GET", undefined, 401);
    const owner = await register(); const other = await register(); const restoreUser = await register();
    const account = await request("/accounts", owner, "POST", { name: "Banco", openingBalance: 1000 }, 201);
    const wallet = await request("/accounts", owner, "POST", { name: "Carteira", openingBalance: 0 }, 201);
    await request("/accounts", other).then(items => assert.equal(items.length, 0));
    await request(`/accounts/${account.id}`, other, "PATCH", { name: "Invasao" }, 404);
    await request("/transactions", other, "POST", { description: "Invalida", amount: 10, type: "EXPENSE", date: "2026-10-01", accountId: account.id }, 400);
    await request("/transfers", owner, "POST", { fromAccountId: account.id, toAccountId: wallet.id, amount: 200, date: "2026-01-01" }, 201);
    const balances = await request("/accounts", owner); assert.equal(balances.find((item: { id: string }) => item.id === account.id).balance, 800); assert.equal(balances.find((item: { id: string }) => item.id === wallet.id).balance, 200);
    const card = await request("/credit-cards", owner, "POST", { name: "Cartao", limitAmount: 500, closingDay: 20, dueDay: 10 }, 201);
    await request(`/credit-cards/${card.id}/purchases`, owner, "POST", { description: "Compra", totalAmount: 100, installments: 3, date: "2026-01-10" }, 201);
    const invoices = await request(`/credit-cards/${card.id}/invoices`, owner); assert.deepEqual(invoices.map((item: { total: number }) => item.total), [33.33, 33.33, 33.34]);
    await request(`/credit-cards/${card.id}/payments`, owner, "POST", { accountId: account.id, invoiceMonth: "2026-01", amount: 33.33, date: "2026-01-15" }, 201);
    await request(`/credit-cards/${card.id}/payments`, owner, "POST", { accountId: account.id, invoiceMonth: "2026-01", amount: 1, date: "2026-01-15" }, 400);
    await request("/accounts", owner).then(items => assert.equal(items.find((item: { id: string }) => item.id === account.id).balance, 766.67));
    const report = await request("/reports?from=2026-01-01&to=2026-03-31T23:59:59.999Z", owner); assert.equal(report.expense, 100); assert.equal(report.income, 0);
    const preview = await request("/imports/preview", owner, "POST", { accountId: account.id, format: "CSV", content: "data,descricao,valor\n2026-01-10,Mercado,-10" });
    const imported = await request("/imports/confirm", owner, "POST", { accountId: account.id, rows: preview }); assert.equal(imported.imported, 1);
    const repeated = await request("/imports/confirm", owner, "POST", { accountId: account.id, rows: preview }); assert.equal(repeated.imported, 0); assert.equal(repeated.reconciled, 1);
    const bill = await request("/bills", owner, "POST", { title: "Internet", amount: 50, dueDate: "2026-01-10", accountId: account.id }, 201);
    await request(`/bills/${bill.id}`, owner, "PATCH", { status: "PAID" }); await request(`/bills/${bill.id}`, owner, "PATCH", { status: "PAID" });
    const accountAfter = (await request("/accounts", owner)).find((item: { id: string }) => item.id === account.id); assert.equal(accountAfter.balance, 706.67);
    const rule = await prisma.recurringRule.create({ data: { userId: owner.userId, resource: "TRANSACTION", transactionType: "INCOME", title: "Recorrencia teste", amount: 10, frequency: "MONTHLY", nextRunAt: new Date() } });
    await Promise.all([ensureRecurringEntries(owner.userId), ensureRecurringEntries(owner.userId)]);
    assert.equal(await prisma.transaction.count({ where: { userId: owner.userId, description: rule.title } }), 1);
    const nullableFields = ["targetId", "description", "title", "name", "amount", "type", "date", "dueDate", "deadline", "categoryId", "notes", "status", "isRecurring", "recurrenceDay", "currentValue", "investedAmount", "contribution", "profitability", "targetAmount", "currentAmount"];
    const action = { ...Object.fromEntries(nullableFields.map(field => [field, null])), operation: "CREATE", resource: "TRANSACTION", description: "Criado pela IA", amount: 5, type: "INCOME", date: "2026-01-01" };
    const history = await prisma.aiHistory.create({ data: { userId: owner.userId, kind: "COMMAND", status: "PENDING", request: "Teste", response: "Teste", actionJson: [action] } });
    const token = jwt.sign({ sub: owner.userId, purpose: "ai-command", historyId: history.id, actions: [action] }, env.JWT_SECRET, { expiresIn: "10m" });
    await assert.rejects(confirmFinancialCommand(other.userId, token));
    const confirmation = await Promise.allSettled([confirmFinancialCommand(owner.userId, token), confirmFinancialCommand(owner.userId, token)]); assert.equal(confirmation.filter(item => item.status === "fulfilled").length, 1);
    assert.equal(await prisma.transaction.count({ where: { userId: owner.userId, description: action.description } }), 1);
    const goal = await prisma.goal.create({ data: { userId: owner.userId, title: "Teste rollback", targetAmount: 100, currentAmount: 0 } });
    const deletion = { ...Object.fromEntries(nullableFields.map(field => [field, null])), operation: "DELETE", resource: "GOAL", targetId: goal.id };
    const failedHistory = await prisma.aiHistory.create({ data: { userId: owner.userId, kind: "COMMAND", status: "PENDING", request: "Teste rollback", response: "Teste", actionJson: [deletion, deletion] } });
    const failedToken = jwt.sign({ sub: owner.userId, purpose: "ai-command", historyId: failedHistory.id, actions: [deletion, deletion] }, env.JWT_SECRET, { expiresIn: "10m" });
    await assert.rejects(confirmFinancialCommand(owner.userId, failedToken));
    assert.ok(await prisma.goal.findUnique({ where: { id: goal.id } }));
    assert.equal((await prisma.aiHistory.findUnique({ where: { id: failedHistory.id } }))?.status, "PENDING");
    const backup = await request("/data/backup", owner); assert.ok(!JSON.stringify(backup).includes("passwordHash"));
    await request("/data/restore", owner, "POST", backup, 409);
    const restored = await request("/data/restore", restoreUser, "POST", backup); assert.ok(restored.restored > 0);
    const restoredAccounts = await request("/accounts", restoreUser); assert.equal(restoredAccounts.find((item: { name: string }) => item.name === "Banco").balance, accountAfter.balance);
    assert.notEqual(restoredAccounts.find((item: { name: string }) => item.name === "Banco").id, account.id);
    await request("/profile/sessions/others", owner, "DELETE", undefined, 204);
    const csrfResponse = await fetch(base + "/accounts", { method: "POST", headers: { Cookie: owner.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Sem CSRF" }) }); assert.equal(csrfResponse.status, 403);
  } finally {
    for (const userId of users) {
      await prisma.transfer.deleteMany({ where: { userId } }); await prisma.cardPayment.deleteMany({ where: { userId } }); await prisma.transaction.deleteMany({ where: { userId } }); await prisma.bill.deleteMany({ where: { userId } }); await prisma.account.deleteMany({ where: { userId } }); await prisma.creditCard.deleteMany({ where: { userId } }); await prisma.user.delete({ where: { id: userId } });
    }
    await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect();
  }
});
