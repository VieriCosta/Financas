import { Router } from "express";
import {
  createBill,
  createCategory,
  createGoal,
  createInvestment,
  createTransaction,
  dashboard,
  deleteBill,
  deleteGoal,
  deleteInvestment,
  deleteTransaction,
  listBills,
  listCategories,
  listGoals,
  listInvestments,
  listTransactions,
  updateBill,
  updateGoal,
  updateInvestment
} from "../controllers/finance.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

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
financeRoutes.post("/categories", createCategory);
financeRoutes.get("/transactions", listTransactions);
financeRoutes.post("/transactions", createTransaction);
financeRoutes.delete("/transactions/:id", deleteTransaction);
financeRoutes.get("/bills", listBills);
financeRoutes.post("/bills", createBill);
financeRoutes.patch("/bills/:id", updateBill);
financeRoutes.delete("/bills/:id", deleteBill);
financeRoutes.get("/investments", listInvestments);
financeRoutes.post("/investments", createInvestment);
financeRoutes.patch("/investments/:id", updateInvestment);
financeRoutes.delete("/investments/:id", deleteInvestment);
financeRoutes.get("/goals", listGoals);
financeRoutes.post("/goals", createGoal);
financeRoutes.patch("/goals/:id", updateGoal);
financeRoutes.delete("/goals/:id", deleteGoal);
