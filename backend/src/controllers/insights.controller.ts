import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { bulkTransactionsDto, dashboardPreferenceDto, tagDto } from "../dtos/finance.dto.js";
import { AppError } from "../utils/AppError.js";
import { audit, getDashboardPreference, getEmergencyReserve, getInternalAlerts, getMonthlyClosing, saveAttachment } from "../services/insights.service.js";
import { periodDto } from "../dtos/ledger.dto.js";

export async function monthlyClosing(req: Request, res: Response) {
  const now = new Date();
  const period = periodDto.parse({ month: req.query.month ?? now.getMonth() + 1, year: req.query.year ?? now.getFullYear() });
  return res.json(await getMonthlyClosing(req.userId, period.month, period.year));
}
export async function closeMonth(req: Request, res: Response) {
  const now = new Date();
  const period = periodDto.parse({ month: req.body.month ?? now.getMonth() + 1, year: req.body.year ?? now.getFullYear() });
  return res.json(await getMonthlyClosing(req.userId, period.month, period.year, true));
}
export async function alerts(req: Request, res: Response) {
  return res.json(await getInternalAlerts(req.userId));
}
export async function emergencyReserve(req: Request, res: Response) {
  return res.json(await getEmergencyReserve(req.userId));
}
export async function listTags(req: Request, res: Response) {
  return res.json(await prisma.tag.findMany({ where: { userId: req.userId }, orderBy: { name: "asc" } }));
}
export async function createTag(req: Request, res: Response) {
  const tag = await prisma.tag.create({ data: { ...tagDto.parse(req.body), userId: req.userId } });
  await audit(req.userId, "CREATE", "TAG", tag.id);
  return res.status(201).json(tag);
}
export async function bulkTransactions(req: Request, res: Response) {
  const data = bulkTransactionsDto.parse(req.body);
  const count = await prisma.transaction.count({ where: { userId: req.userId, id: { in: data.ids } } });
  if (count !== data.ids.length) throw new AppError("Uma ou mais movimentacoes sao invalidas.", 400);
  if (data.action === "DELETE") {
    if (await prisma.transaction.count({ where: { userId: req.userId, id: { in: data.ids }, creditCardId: { not: null } } })) throw new AppError("Compras de cartao nao podem ser excluidas em lote.", 400);
    await prisma.transaction.deleteMany({ where: { userId: req.userId, id: { in: data.ids } } });
  }
  if (data.action === "SET_CATEGORY") {
    if (!data.categoryId) throw new AppError("Informe uma categoria.", 400);
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId, archived: false } });
    if (!category) throw new AppError("Categoria invalida.", 400);
    if (category.type && await prisma.transaction.count({ where: { id: { in: data.ids }, userId: req.userId, type: { not: category.type } } })) throw new AppError("Categoria incompativel com as movimentacoes selecionadas.", 400);
    await prisma.transaction.updateMany({ where: { userId: req.userId, id: { in: data.ids } }, data: { categoryId: data.categoryId } });
  }
  if (data.action === "ADD_TAG") {
    if (!data.tagId || !await prisma.tag.findFirst({ where: { id: data.tagId, userId: req.userId, archived: false } })) throw new AppError("Tag invalida.", 400);
    await prisma.transactionTag.createMany({ data: data.ids.map((transactionId) => ({ transactionId, tagId: data.tagId! })), skipDuplicates: true });
  }
  await audit(req.userId, data.action, "TRANSACTION_BULK", undefined, { count: data.ids.length });
  return res.json({ count: data.ids.length });
}
export async function uploadAttachment(req: Request, res: Response) {
  const filename = String(req.header("X-Filename") ?? "anexo").replace(/[^\w.\- ]/g, "_");
  return res.status(201).json(await saveAttachment(req.userId, String(req.params.id), filename, req.header("Content-Type") ?? "", req.body as Buffer));
}
export async function downloadAttachment(req: Request, res: Response) {
  const item = await prisma.attachment.findFirst({ where: { id: String(req.params.id), userId: req.userId } });
  if (!item) throw new AppError("Anexo nao encontrado.", 404);
  res.setHeader("Content-Type", item.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${item.filename.replace(/"/g, "")}"`);
  return res.send(item.content);
}
export async function deleteAttachment(req: Request, res: Response) {
  await prisma.attachment.deleteMany({ where: { id: String(req.params.id), userId: req.userId } });
  return res.status(204).send();
}
export async function dashboardPreference(req: Request, res: Response) {
  return res.json(await getDashboardPreference(req.userId));
}
export async function saveDashboardPreference(req: Request, res: Response) {
  const data = dashboardPreferenceDto.parse(req.body);
  return res.json(await prisma.dashboardPreference.upsert({ where: { userId: req.userId }, create: { userId: req.userId, ...data }, update: data }));
}
export async function auditLogs(req: Request, res: Response) {
  return res.json(await prisma.auditLog.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }));
}
