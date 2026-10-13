import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfProtection } from "../utils/session.js";
import { accountDto, cardDto, paymentDto, purchaseDto, transferDto } from "../dtos/ledger.dto.js";
import { cardInvoices, createCardPurchase, ensureAccount, listAccounts, payInvoice } from "../services/ledger.service.js";
import { AppError } from "../utils/AppError.js";
import { financialReport, reportDto } from "../services/report.service.js";

export const ledgerRoutes = Router();
ledgerRoutes.use(authMiddleware);
ledgerRoutes.get("/reports", async (req, res) => res.json(await financialReport(req.userId, reportDto.parse(req.query))));
ledgerRoutes.get("/accounts", async (req, res) => res.json(await listAccounts(req.userId)));
ledgerRoutes.post("/accounts", csrfProtection, async (req, res) => res.status(201).json(await prisma.account.create({ data: { ...accountDto.parse(req.body), userId: req.userId } })));
ledgerRoutes.patch("/accounts/:id", csrfProtection, async (req, res) => {
  const data = accountDto.partial().parse(req.body);
  const updated = await prisma.account.updateMany({ where: { id: String(req.params.id), userId: req.userId }, data });
  if (!updated.count) throw new AppError("Conta nao encontrada.", 404);
  res.json({ updated: true });
});
ledgerRoutes.get("/transfers", async (req, res) => res.json(await prisma.transfer.findMany({ where: { userId: req.userId }, include: { fromAccount: true, toAccount: true }, orderBy: { date: "desc" } })));
ledgerRoutes.post("/transfers", csrfProtection, async (req, res) => {
  const data = transferDto.parse(req.body);
  const result = await prisma.$transaction(async tx => {
    await ensureAccount(req.userId, data.fromAccountId, tx);
    await ensureAccount(req.userId, data.toAccountId, tx);
    return tx.transfer.create({ data: { ...data, userId: req.userId } });
  });
  res.status(201).json(result);
});
ledgerRoutes.delete("/transfers/:id", csrfProtection, async (req, res) => { await prisma.transfer.deleteMany({ where: { id: String(req.params.id), userId: req.userId } }); res.status(204).send(); });
ledgerRoutes.get("/credit-cards", async (req, res) => res.json(await prisma.creditCard.findMany({ where: { userId: req.userId }, orderBy: { name: "asc" } })));
ledgerRoutes.post("/credit-cards", csrfProtection, async (req, res) => res.status(201).json(await prisma.creditCard.create({ data: { ...cardDto.parse(req.body), userId: req.userId } })));
ledgerRoutes.patch("/credit-cards/:id", csrfProtection, async (req, res) => {
  const data = cardDto.partial().parse(req.body);
  await prisma.$transaction(async tx => {
    const id = String(req.params.id);
    await tx.$queryRaw`SELECT id FROM "CreditCard" WHERE id = ${id} AND "userId" = ${req.userId} FOR UPDATE`;
    const card = await tx.creditCard.findFirst({ where: { id, userId: req.userId } });
    if (!card) throw new AppError("Cartao nao encontrado.", 404);
    if ((data.closingDay != null && data.closingDay !== card.closingDay || data.dueDay != null && data.dueDay !== card.dueDay) && await tx.transaction.count({ where: { creditCardId: id, userId: req.userId } })) throw new AppError("Datas de cartoes com compras registradas nao podem ser alteradas. Arquive e crie outro cartao.", 400);
    await tx.creditCard.update({ where: { id }, data });
  });
  res.json({ updated: true });
});
ledgerRoutes.get("/credit-cards/:id/invoices", async (req, res) => res.json(await cardInvoices(req.userId, String(req.params.id))));
ledgerRoutes.post("/credit-cards/:id/purchases", csrfProtection, async (req, res) => res.status(201).json(await createCardPurchase(req.userId, String(req.params.id), purchaseDto.parse(req.body))));
ledgerRoutes.post("/credit-cards/:id/payments", csrfProtection, async (req, res) => res.status(201).json(await payInvoice(req.userId, String(req.params.id), paymentDto.parse(req.body))));
