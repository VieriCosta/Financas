import { DashboardData, PaginatedTransactions } from "./finance";
export type Toast = { type: "success" | "error"; message: string } | null;
export type TransactionFilters = { month: string; year: string; type: string; search: string; categoryId: string; tagId: string; minAmount: string; maxAmount: string; accountId: string; reconciled: string };
export type RefreshedData = { dashboard: DashboardData; transactions: PaginatedTransactions };
