import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfProtection } from "../utils/session.js";
import { categoryDto, recurringRuleDto, tagDto } from "../dtos/finance.dto.js";
import { AppError } from "../utils/AppError.js";

export const settingsRoutes = Router();
settingsRoutes.use(authMiddleware);
settingsRoutes.patch("/categories/:id", csrfProtection, async (req, res) => {
  const data = categoryDto.partial().extend({ archived: z.boolean().optional() }).parse(req.body);
  const id = String(req.params.id);
  const current = await prisma.category.findFirst({ where: { id, userId: req.userId } });
  if (!current) throw new AppError("Categoria nao encontrada.", 404);
  if (data.type && data.type !== current.type && (await prisma.transaction.count({ where: { userId: req.userId, categoryId: id } }) || await prisma.recurringRule.count({ where: { userId: req.userId, categoryId: id } }) || await prisma.budget.count({ where: { userId: req.userId, categoryId: id } }))) throw new AppError("Uma categoria em uso nao pode mudar de tipo.", 400);
  await prisma.category.updateMany({ where: { id, userId: req.userId }, data }); res.json({ updated: true });
});
settingsRoutes.patch("/tags/:id", csrfProtection, async (req, res) => {
  const data = tagDto.partial().extend({ archived: z.boolean().optional() }).parse(req.body);
  if (!(await prisma.tag.updateMany({ where: { id: String(req.params.id), userId: req.userId }, data })).count) throw new AppError("Tag nao encontrada.", 404);
  res.json({ updated: true });
});
settingsRoutes.patch("/recurring-rules/:id", csrfProtection, async (req, res) => {
  const id = String(req.params.id);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "RecurringRule" WHERE id = ${id} AND "userId" = ${req.userId} FOR UPDATE`;
    const current = await tx.recurringRule.findFirst({ where: { id, userId: req.userId } });
    if (!current) throw new AppError("Regra nao encontrada.", 404);
    const data = recurringRuleDto.parse({ ...current, ...req.body });
    if (data.categoryId && !await tx.category.findFirst({ where: { id: data.categoryId, userId: req.userId, archived: false, OR: [{ type: null }, { type: data.transactionType ?? "EXPENSE" }] } })) throw new AppError("Categoria invalida para a regra.", 400);
    await tx.recurringRule.update({ where: { id }, data });
  }); res.json({ updated: true });
});
