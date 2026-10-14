import express, { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfProtection } from "../utils/session.js";
import {
  confirmImport,
  importConfirmDto,
  importPreview,
  parseStatement,
} from "../services/import.service.js";

export const importRoutes = Router();
importRoutes.use(authMiddleware);
const previewDto = z.object({
  accountId: z.string().uuid(),
  format: z.enum(["CSV", "OFX"]),
  content: z
    .string()
    .min(1)
    .max(2 * 1024 * 1024),
  mapping: z
    .object({
      date: z.number().int().nonnegative(),
      description: z.number().int().nonnegative(),
      amount: z.number().int().nonnegative(),
      type: z.number().int().optional(),
      externalId: z.number().int().optional(),
    })
    .optional(),
});
importRoutes.post(
  "/preview",
  csrfProtection,
  express.json({ limit: "3mb" }),
  async (req, res) => {
    const data = previewDto.parse(req.body);
    res.json(
      await importPreview(
        req.userId,
        data.accountId,
        parseStatement(data.content, data.format, data.mapping),
      ),
    );
  },
);
importRoutes.post(
  "/confirm",
  csrfProtection,
  express.json({ limit: "3mb" }),
  async (req, res) => {
    const data = importConfirmDto.parse(req.body);
    res.json(await confirmImport(req.userId, data.accountId, data.rows));
  },
);
