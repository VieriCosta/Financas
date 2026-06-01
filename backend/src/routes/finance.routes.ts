import { Router } from "express";
import {
  createBill,
  createCategory,
  createGoal,
  createInstallmentPurchase,
  createInvestment,
  createRecurringRule,
  createTransaction,
  dashboard,
  deleteBill,
  deleteGoal,
  deleteBudget,
  deleteInvestment,
  deleteTransaction,
  deleteRecurringRule,
  exportTransactionsCsv,
  listBills,
  listCategories,
  listGoals,
  getBudgets,
  getRecurringRules,
  listInvestments,
  listTransactions,
  updateBill,
  updateGoal,
  updateInvestment,
  updateTransaction,
  saveBudget
} from "../controllers/finance.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfProtection } from "../utils/session.js";
import express from "express";
import { alerts, auditLogs, bulkTransactions, closeMonth, createTag, dashboardPreference, deleteAttachment, downloadAttachment, emergencyReserve, listTags, monthlyClosing, saveDashboardPreference, uploadAttachment } from "../controllers/insights.controller.js";

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

/**
 * @openapi
 * /dashboard:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Retorna indicadores, series, metas, agenda e movimentacoes recentes
 */
financeRoutes.get("/dashboard", dashboard);
financeRoutes.get("/categories", listCategories);
financeRoutes.post("/categories", csrfProtection, createCategory);
financeRoutes.get("/transactions", listTransactions);
financeRoutes.get("/transactions/export.csv", exportTransactionsCsv);
financeRoutes.post("/transactions", csrfProtection, createTransaction);
financeRoutes.post("/installments", csrfProtection, createInstallmentPurchase);
financeRoutes.patch("/transactions/:id", csrfProtection, updateTransaction);
financeRoutes.delete("/transactions/:id", csrfProtection, deleteTransaction);
financeRoutes.get("/bills", listBills);
financeRoutes.post("/bills", csrfProtection, createBill);
financeRoutes.patch("/bills/:id", csrfProtection, updateBill);
financeRoutes.delete("/bills/:id", csrfProtection, deleteBill);
financeRoutes.get("/investments", listInvestments);
financeRoutes.post("/investments", csrfProtection, createInvestment);
financeRoutes.patch("/investments/:id", csrfProtection, updateInvestment);
financeRoutes.delete("/investments/:id", csrfProtection, deleteInvestment);
financeRoutes.get("/goals", listGoals);
financeRoutes.post("/goals", csrfProtection, createGoal);
financeRoutes.patch("/goals/:id", csrfProtection, updateGoal);
financeRoutes.delete("/goals/:id", csrfProtection, deleteGoal);
financeRoutes.get("/budgets", getBudgets);
financeRoutes.post("/budgets", csrfProtection, saveBudget);
financeRoutes.delete("/budgets/:id", csrfProtection, deleteBudget);
financeRoutes.get("/recurring-rules", getRecurringRules);
financeRoutes.post("/recurring-rules", csrfProtection, createRecurringRule);
financeRoutes.delete("/recurring-rules/:id", csrfProtection, deleteRecurringRule);
financeRoutes.get("/monthly-closing", monthlyClosing);
financeRoutes.post("/monthly-closing", csrfProtection, closeMonth);
financeRoutes.get("/alerts", alerts);
financeRoutes.get("/emergency-reserve", emergencyReserve);
financeRoutes.get("/tags", listTags);
financeRoutes.post("/tags", csrfProtection, createTag);
financeRoutes.post("/transactions/bulk", csrfProtection, bulkTransactions);
financeRoutes.post("/transactions/:id/attachments", csrfProtection, express.raw({ type: ["image/jpeg", "image/png", "application/pdf"], limit: "2mb" }), uploadAttachment);
financeRoutes.get("/attachments/:id", downloadAttachment);
financeRoutes.delete("/attachments/:id", csrfProtection, deleteAttachment);
financeRoutes.get("/dashboard-preference", dashboardPreference);
financeRoutes.put("/dashboard-preference", csrfProtection, saveDashboardPreference);
financeRoutes.get("/audit-logs", auditLogs);
