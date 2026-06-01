import { Request, Response } from "express";
import { aiAdviceDto, aiCommandConfirmDto, aiCommandPreviewDto } from "../dtos/ai.dto.js";
import { askFinancialAdvice, confirmFinancialCommand, generateMonthlyReport, listAiHistory, previewFinancialCommand } from "../services/ai.service.js";

export async function advice(req: Request, res: Response) {
  const { message } = aiAdviceDto.parse(req.body);
  return res.json({ message: await askFinancialAdvice(req.userId, message) });
}

export async function previewCommand(req: Request, res: Response) {
  const { message } = aiCommandPreviewDto.parse(req.body);
  return res.json(await previewFinancialCommand(req.userId, message));
}

export async function confirmCommand(req: Request, res: Response) {
  const { confirmationToken } = aiCommandConfirmDto.parse(req.body);
  return res.status(201).json(await confirmFinancialCommand(req.userId, confirmationToken));
}

export async function history(req: Request, res: Response) {
  return res.json(await listAiHistory(req.userId));
}

export async function monthlyReport(req: Request, res: Response) {
  return res.json({ message: await generateMonthlyReport(req.userId) });
}
