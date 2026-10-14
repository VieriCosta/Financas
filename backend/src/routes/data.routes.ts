import express, { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfProtection } from "../utils/session.js";
import { exportBackup, restoreBackup } from "../services/backup.service.js";

export const dataRoutes = Router();
dataRoutes.use(authMiddleware);
dataRoutes.get("/backup", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.attachment("financas-backup.json").json(await exportBackup(req.userId));
});
dataRoutes.post(
  "/restore",
  csrfProtection,
  express.json({ limit: "30mb" }),
  async (req, res) => res.json(await restoreBackup(req.userId, req.body)),
);
