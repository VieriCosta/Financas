import { createHash } from "node:crypto";
import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../config/prisma.js";
import { ensureAccount } from "./ledger.service.js";
import { amount } from "../dtos/ledger.dto.js";

export const importRowDto = z.object({ description: z.string().trim().min(2).max(160), amount, type: z.enum(["INCOME", "EXPENSE"]), date: z.coerce.date(), externalId: z.string().max(255).optional(), categoryId: z.string().uuid().optional() });
export type ImportRow = z.infer<typeof importRowDto>;
export const importConfirmDto = z.object({ accountId: z.string().uuid(), rows: z.array(importRowDto).min(1).max(2000) });

export function csvRows(source: string): string[][] {
  const firstLine = source.split(/\r?\n/)[0];
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted;
    } else if (!quoted && char === delimiter) { row.push(field); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new AppError("CSV com aspas nao fechadas.", 400);
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function financialDate(raw: string) {
  const value = raw.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : value.slice(0, 10);
  const date = new Date(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new AppError(`Data invalida: ${raw}`, 400);
  return date;
}
function financialNumber(raw: string) {
  const clean = raw.replace(/R\$|\s/g, "");
  const number = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
  if (!clean || !Number.isFinite(number) || number === 0) throw new AppError(`Valor invalido: ${raw}`, 400);
  return number;
}
export function parseStatement(content: string, format: "CSV" | "OFX", mapping?: { date: number; description: number; amount: number; type?: number; externalId?: number }) {
  let items: ImportRow[];
  if (format === "OFX") {
    const blocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
    items = blocks.map(([, block]) => {
      const read = (tag: string) => new RegExp(`<${tag}>([^<\r\n]*)`, "i").exec(block)?.[1].trim() ?? "";
      const rawDate = read("DTPOSTED");
      const value = financialNumber(read("TRNAMT"));
      return importRowDto.parse({ description: (read("NAME") || read("MEMO") || "Movimentacao importada").slice(0, 160), date: financialDate(`${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`), amount: Math.abs(value), type: value > 0 ? "INCOME" : "EXPENSE", externalId: read("FITID") || undefined });
    });
  } else {
    const rows = csvRows(content.replace(/^\uFEFF/, ""));
    const headers = (rows.shift() ?? []).map(value => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const find = (names: string[]) => headers.findIndex(value => names.includes(value));
    const columns = mapping ?? { date: find(["data", "date"]), description: find(["descricao", "description", "historico"]), amount: find(["valor", "amount"]), type: find(["tipo", "type"]), externalId: find(["id", "fitid"]) };
    if ([columns.date, columns.description, columns.amount].some(value => value < 0 || value >= headers.length)) throw new AppError("Mapeie as colunas de data, descricao e valor.", 400);
    items = rows.map((row, index) => {
      try {
        const value = financialNumber(row[columns.amount] ?? "");
        const type = columns.type != null && columns.type >= 0 ? row[columns.type]?.trim().toUpperCase() : undefined;
        if (type && !["RECEITA", "DESPESA", "INCOME", "EXPENSE"].includes(type)) throw new Error("Tipo invalido");
        return importRowDto.parse({ description: row[columns.description], date: financialDate(row[columns.date] ?? ""), amount: Math.abs(value), type: type ? ["RECEITA", "INCOME"].includes(type) ? "INCOME" : "EXPENSE" : value > 0 ? "INCOME" : "EXPENSE", externalId: columns.externalId != null && columns.externalId >= 0 ? row[columns.externalId] || undefined : undefined });
      } catch { throw new AppError(`Linha ${index + 2}: verifique data, descricao, tipo e valor.`, 400); }
    });
  }
  if (!items.length || items.length > 2000) throw new AppError("O extrato deve conter entre 1 e 2000 movimentacoes.", 400);
  return items;
}
export function importKey(accountId: string, row: ImportRow) {
  return createHash("sha256").update(JSON.stringify([accountId, row.externalId || null, row.date.toISOString().slice(0, 10), row.type, Math.round(row.amount * 100), row.description.trim().toLowerCase()])).digest("hex");
}
export async function importPreview(userId: string, accountId: string, rows: ImportRow[]) {
  await ensureAccount(userId, accountId);
  const existing = await prisma.transaction.findMany({ where: { userId, accountId, creditCardId: null }, select: { id: true, description: true, amount: true, type: true, date: true, importKey: true } });
  const seen = new Set<string>();
  return rows.map(row => {
    const key = importKey(accountId, row);
    const match = existing.find(item => item.importKey === key || item.date.toISOString().slice(0, 10) === row.date.toISOString().slice(0, 10) && item.type === row.type && Number(item.amount) === row.amount && item.description.trim().toLowerCase() === row.description.trim().toLowerCase());
    const duplicate = Boolean(match) || seen.has(key); seen.add(key);
    return { ...row, duplicate, matchingTransactionId: match?.id };
  });
}
export async function confirmImport(userId: string, accountId: string, rows: ImportRow[]) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Account" WHERE id = ${accountId} AND "userId" = ${userId} FOR UPDATE`;
    await ensureAccount(userId, accountId, tx);
    let imported = 0; let skipped = 0; let reconciled = 0;
    for (const row of rows) {
      if (row.categoryId && !await tx.category.findFirst({ where: { id: row.categoryId, userId, archived: false, OR: [{ type: null }, { type: row.type }] } })) throw new AppError("Categoria invalida para a importacao.", 400);
      const key = importKey(accountId, row);
      const day = new Date(`${row.date.toISOString().slice(0, 10)}T00:00:00Z`);
      const end = new Date(day.getTime() + 86400000);
      const same = await tx.transaction.findFirst({ where: { userId, accountId, creditCardId: null, OR: [{ importKey: key }, { date: { gte: day, lt: end }, amount: row.amount, type: row.type, description: { equals: row.description, mode: "insensitive" } }] } });
      if (same) { await tx.transaction.update({ where: { id: same.id }, data: { reconciled: true } }); skipped++; reconciled++; }
      else { const { externalId: _externalId, ...data } = row; await tx.transaction.create({ data: { ...data, userId, accountId, importKey: key, reconciled: true } }); imported++; }
    }
    await tx.auditLog.create({ data: { userId, action: "IMPORT", resource: "STATEMENT", details: { imported, skipped, reconciled } } });
    return { imported, skipped, reconciled };
  }, { timeout: 60000 });
}
