import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { billDto, budgetDto, categoryDto, financeFiltersDto, goalDto, installmentDto, investmentDto, recurringRuleDto, transactionDto, updateBillDto, updateGoalDto, updateInvestmentDto, updateTransactionDto } from "../dtos/finance.dto.js";
import { buildTransactionWhere, ensureRecurringBills, getDashboard, toCsv } from "../services/finance.service.js";
import { createInstallments, listBudgets, listRecurringRules, upsertBudget } from "../services/planning.service.js";
import { AppError } from "../utils/AppError.js";
import { audit } from "../services/insights.service.js";
import { ensureAccount } from "../services/ledger.service.js";
import { periodDto } from "../dtos/ledger.dto.js";

export async function dashboard(req: Request, res: Response) {
  return res.json(await getDashboard(req.userId));
}

export async function listCategories(req: Request, res: Response) {
  return res.json(await prisma.category.findMany({ where: { userId: req.userId }, orderBy: { name: "asc" } }));
}

export async function createCategory(req: Request, res: Response) {
  const data = categoryDto.parse(req.body);
  return res.status(201).json(await prisma.category.create({ data: { ...data, userId: req.userId } }));
}

export async function listTransactions(req: Request, res: Response) {
  const filters = financeFiltersDto.parse(req.query);
  const where = buildTransactionWhere(req.userId, filters);
  const [items, total, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, tags: { include: { tag: true } }, attachments: { select: { id: true, filename: true, mimeType: true, size: true } } },
      orderBy: { date: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } })
  ]);

  return res.json({
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    summary: { income: Number(totals.find(item => item.type === "INCOME")?._sum.amount ?? 0), expense: Number(totals.find(item => item.type === "EXPENSE")?._sum.amount ?? 0) }
  });
}

export async function exportTransactionsCsv(req: Request, res: Response) {
  const filters = financeFiltersDto.parse(req.query);
  const transactions = await prisma.transaction.findMany({
      where: buildTransactionWhere(req.userId, filters),
      include: { category: true },
      orderBy: { date: "desc" }
  });

  const csv = toCsv(
    transactions.map((transaction) => ({
      data: transaction.date.toISOString().slice(0, 10),
      descricao: transaction.description,
      tipo: transaction.type === "INCOME" ? "Receita" : "Despesa",
      categoria: transaction.category?.name ?? "Sem categoria",
      valor: Number(transaction.amount),
      observacoes: transaction.notes
    }))
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=movimentacoes.csv");
  return res.send(csv);
}

export async function createTransaction(req: Request, res: Response) {
  const data = transactionDto.parse(req.body);
  await ensureAccount(req.userId, data.accountId);
  await ensureCategoryOwnership(req.userId, data.categoryId, data.type);
  const transaction = await prisma.transaction.create({ data: { ...data, userId: req.userId } });
  await audit(req.userId, "CREATE", "TRANSACTION", transaction.id);
  return res.status(201).json(transaction);
}

export async function createInstallmentPurchase(req: Request, res: Response) {
  const data = installmentDto.parse(req.body);
  return res.status(201).json(await createInstallments(req.userId, data));
}

export async function getBudgets(req: Request, res: Response) {
  const now = new Date();
  const { month, year } = periodDto.parse({ month: req.query.month ?? now.getMonth() + 1, year: req.query.year ?? now.getFullYear() });
  return res.json(await listBudgets(req.userId, month, year));
}

export async function saveBudget(req: Request, res: Response) {
  return res.status(201).json(await upsertBudget(req.userId, budgetDto.parse(req.body)));
}

export async function deleteBudget(req: Request, res: Response) {
  await prisma.budget.deleteMany({ where: { id: String(req.params.id), userId: req.userId } });
  return res.status(204).send();
}

export async function getRecurringRules(req: Request, res: Response) {
  return res.json(await listRecurringRules(req.userId));
}

export async function createRecurringRule(req: Request, res: Response) {
  const data = recurringRuleDto.parse(req.body);
  if (data.categoryId && data.transactionType) await ensureCategoryOwnership(req.userId, data.categoryId, data.transactionType);
  return res.status(201).json(await prisma.recurringRule.create({ data: { ...data, userId: req.userId } }));
}

export async function deleteRecurringRule(req: Request, res: Response) {
  await prisma.recurringRule.deleteMany({ where: { id: String(req.params.id), userId: req.userId } });
  return res.status(204).send();
}

export async function updateTransaction(req: Request, res: Response) {
  const data = updateTransactionDto.parse(req.body);
  const transactionId = String(req.params.id);
  const currentTransaction = await prisma.transaction.findFirstOrThrow({
    where: { id: transactionId, userId: req.userId }
  });
  if (currentTransaction.creditCardId && Object.keys(data).some(key => !["notes", "reconciled", "categoryId"].includes(key))) throw new AppError("Compras de cartao permitem editar apenas categoria, observacoes e conciliacao.", 400);
  if (data.accountId) await ensureAccount(req.userId, data.accountId);

  await ensureCategoryOwnership(
    req.userId,
    data.categoryId ?? currentTransaction.categoryId ?? undefined,
    data.type ?? currentTransaction.type
  );

  await prisma.transaction.updateMany({
    where: { id: transactionId, userId: req.userId },
    data
  });

  const transaction = await prisma.transaction.findFirstOrThrow({
    where: { id: transactionId, userId: req.userId },
    include: { category: true }
  });
  await audit(req.userId, "UPDATE", "TRANSACTION", transaction.id);

  return res.json(transaction);
}

export async function deleteTransaction(req: Request, res: Response) {
  const transactionId = String(req.params.id);
  const current = await prisma.transaction.findFirst({ where: { id: transactionId, userId: req.userId } });
  if (current?.creditCardId) throw new AppError("Compras de cartao nao podem ser excluidas pelo historico comum.", 400);
  await prisma.transaction.deleteMany({ where: { id: transactionId, userId: req.userId } });
  await audit(req.userId, "DELETE", "TRANSACTION", transactionId);
  return res.status(204).send();
}

export async function listBills(req: Request, res: Response) {
  await ensureRecurringBills(req.userId);
  return res.json(await prisma.bill.findMany({ where: { userId: req.userId }, orderBy: { dueDate: "asc" } }));
}

export async function createBill(req: Request, res: Response) {
  const data = billDto.parse(req.body);
  await ensureAccount(req.userId, data.accountId);
  return res.status(201).json(await prisma.bill.create({ data: { ...data, paidAt: data.status === "PAID" ? new Date() : null, userId: req.userId } }));
}

export async function updateBill(req: Request, res: Response) {
  const data = updateBillDto.parse(req.body);
  const billId = String(req.params.id);
  await ensureAccount(req.userId, data.accountId);

  await prisma.bill.updateMany({
    where: { id: billId, userId: req.userId },
    data: { ...data, ...(data.status ? { paidAt: data.status === "PAID" ? new Date() : null } : {}) }
  });

  const bill = await prisma.bill.findFirstOrThrow({
    where: { id: billId, userId: req.userId }
  });

  return res.json(bill);
}

export async function deleteBill(req: Request, res: Response) {
  const billId = String(req.params.id);
  await prisma.bill.deleteMany({ where: { id: billId, userId: req.userId } });
  return res.status(204).send();
}

export async function listInvestments(req: Request, res: Response) {
  return res.json(await prisma.investment.findMany({ where: { userId: req.userId }, orderBy: { updatedAt: "desc" } }));
}

export async function createInvestment(req: Request, res: Response) {
  const data = investmentDto.parse(req.body);
  return res.status(201).json(await prisma.investment.create({ data: { ...data, userId: req.userId } }));
}

export async function updateInvestment(req: Request, res: Response) {
  const data = updateInvestmentDto.parse(req.body);
  const investmentId = String(req.params.id);
  const { addContribution, ...investmentData } = data;

  const currentInvestment = await prisma.investment.findFirstOrThrow({
    where: { id: investmentId, userId: req.userId }
  });

  const investedAmount = addContribution
    ? Number(currentInvestment.investedAmount) + addContribution
    : investmentData.investedAmount;
  const currentValue = addContribution
    ? Number(currentInvestment.currentValue) + addContribution
    : investmentData.currentValue;

  const investment = await prisma.investment.update({
    where: { id: investmentId },
    data: {
      ...investmentData,
      investedAmount,
      currentValue,
      contribution: addContribution ?? investmentData.contribution
    }
  });

  return res.json(investment);
}

export async function deleteInvestment(req: Request, res: Response) {
  const investmentId = String(req.params.id);
  await prisma.investment.deleteMany({ where: { id: investmentId, userId: req.userId } });
  return res.status(204).send();
}

export async function listGoals(req: Request, res: Response) {
  return res.json(await prisma.goal.findMany({ where: { userId: req.userId }, orderBy: { deadline: "asc" } }));
}

export async function createGoal(req: Request, res: Response) {
  const data = goalDto.parse(req.body);
  return res.status(201).json(await prisma.goal.create({ data: { ...data, userId: req.userId } }));
}

export async function updateGoal(req: Request, res: Response) {
  const data = updateGoalDto.parse(req.body);
  const goalId = String(req.params.id);
  const { addAmount, ...goalData } = data;

  const currentGoal = await prisma.goal.findFirstOrThrow({
    where: { id: goalId, userId: req.userId }
  });

  const currentAmount = addAmount
    ? Number(currentGoal.currentAmount) + addAmount
    : goalData.currentAmount;

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...goalData,
      currentAmount
    }
  });

  return res.json(goal);
}

export async function deleteGoal(req: Request, res: Response) {
  const goalId = String(req.params.id);
  await prisma.goal.deleteMany({ where: { id: goalId, userId: req.userId } });
  return res.status(204).send();
}

async function ensureCategoryOwnership(userId: string, categoryId: string | undefined, transactionType: "INCOME" | "EXPENSE") {
  if (!categoryId) return;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, archived: false }
  });

  if (!category || (category.type && category.type !== transactionType)) {
    throw new AppError("Categoria invalida para esta movimentacao.", 400);
  }
}
