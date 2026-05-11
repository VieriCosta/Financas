export type TransactionType = "INCOME" | "EXPENSE";
export type BillStatus = "PENDING" | "PAID";
export type InvestmentType = "STOCK" | "CRYPTO" | "FIXED_INCOME" | "EMERGENCY_RESERVE" | "OTHER";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  type?: TransactionType;
};

export type Transaction = {
  id: string;
  description: string;
  amount: string | number;
  type: TransactionType;
  date: string;
  category?: Category;
};

export type Bill = {
  id: string;
  title: string;
  amount: string | number;
  dueDate: string;
  status: BillStatus;
  isRecurring?: boolean;
  recurrenceDay?: number;
};

export type Investment = {
  id: string;
  name: string;
  type: InvestmentType;
  currentValue: string | number;
  investedAmount: string | number;
  contribution: string | number;
  profitability: string | number;
  monthlyYieldRate?: string | number;
  cdiMonthlyRate?: string | number;
  cdiPercent?: string | number;
  referenceDate?: string;
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: string | number;
  currentAmount: string | number;
  deadline?: string;
};

export type DashboardData = {
  cards: {
    balance: number;
    monthIncome: number;
    monthExpense: number;
    investments: number;
  };
  monthlySeries: Array<{ month: string; receitas: number; despesas: number }>;
  categorySummary: Array<{ name: string; value: number; color?: string }>;
  goals: Goal[];
  bills: Bill[];
  investmentsList: Investment[];
  recentTransactions: Transaction[];
};
