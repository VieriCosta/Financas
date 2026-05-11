import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { billDto, categoryDto, financeFiltersDto, goalDto, investmentDto, transactionDto, updateBillDto, updateGoalDto, updateInvestmentDto } from "../dtos/finance.dto.js";
import { buildTransactionWhere, getDashboard } from "../services/finance.service.js";

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
  return res.json(
    await prisma.transaction.findMany({
      where: buildTransactionWhere(req.userId, filters),
      include: { category: true },
      orderBy: { date: "desc" }
    })
  );
}

export async function createTransaction(req: Request, res: Response) {
  const data = transactionDto.parse(req.body);
  return res.status(201).json(await prisma.transaction.create({ data: { ...data, userId: req.userId } }));
}

export async function deleteTransaction(req: Request, res: Response) {
  const transactionId = String(req.params.id);
  await prisma.transaction.deleteMany({ where: { id: transactionId, userId: req.userId } });
  return res.status(204).send();
}

export async function listBills(req: Request, res: Response) {
  return res.json(await prisma.bill.findMany({ where: { userId: req.userId }, orderBy: { dueDate: "asc" } }));
}

export async function createBill(req: Request, res: Response) {
  const data = billDto.parse(req.body);
  return res.status(201).json(await prisma.bill.create({ data: { ...data, userId: req.userId } }));
}

export async function updateBill(req: Request, res: Response) {
  const data = updateBillDto.parse(req.body);
  const billId = String(req.params.id);

  await prisma.bill.updateMany({
    where: { id: billId, userId: req.userId },
    data
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
