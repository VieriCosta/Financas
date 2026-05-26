import { BillStatus, InvestmentType, TransactionType } from "@prisma/client";
import { z } from "zod";

export const categoryDto = z.object({
  name: z.string().min(2),
  color: z.string().default("#2563eb"),
  icon: z.string().default("Wallet"),
  type: z.nativeEnum(TransactionType).optional()
});

export const transactionDto = z.object({
  description: z.string().min(2),
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(TransactionType),
  date: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  notes: z.string().optional()
});

export const updateTransactionDto = transactionDto.partial();

export const billDto = z.object({
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  status: z.nativeEnum(BillStatus).default(BillStatus.PENDING),
  isRecurring: z.coerce.boolean().default(false),
  recurrenceDay: z.coerce.number().min(1).max(31).optional(),
  reminderAt: z.coerce.date().optional()
});

export const updateBillDto = billDto.partial();

export const investmentDto = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(InvestmentType),
  currentValue: z.coerce.number().nonnegative(),
  investedAmount: z.coerce.number().nonnegative(),
  contribution: z.coerce.number().nonnegative().default(0),
  profitability: z.coerce.number().default(0),
  monthlyYieldRate: z.coerce.number().default(0),
  cdiMonthlyRate: z.coerce.number().default(0),
  cdiPercent: z.coerce.number().default(100),
  ticker: z.string().trim().min(1).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  averagePrice: z.coerce.number().nonnegative().optional(),
  broker: z.string().trim().min(1).optional(),
  institution: z.string().trim().min(1).optional(),
  indexer: z.string().trim().min(1).optional(),
  annualRate: z.coerce.number().optional(),
  maturityDate: z.coerce.date().optional(),
  liquidity: z.string().trim().min(1).optional(),
  custodyLocation: z.string().trim().min(1).optional(),
  walletAddress: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  referenceDate: z.coerce.date().optional()
});

export const updateInvestmentDto = investmentDto.partial().extend({
  addContribution: z.coerce.number().positive().optional()
});

export const goalDto = z.object({
  title: z.string().min(2),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative().default(0),
  deadline: z.coerce.date().optional()
});

export const updateGoalDto = goalDto.partial().extend({
  addAmount: z.coerce.number().positive().optional()
});

export const financeFiltersDto = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).optional(),
  categoryId: z.string().uuid().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
});
