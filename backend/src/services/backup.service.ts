import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const backupModels = [
  "Category",
  "Tag",
  "Account",
  "CreditCard",
  "Transaction",
  "Bill",
  "Investment",
  "Goal",
  "Budget",
  "RecurringRule",
  "Transfer",
  "CardPayment",
  "TransactionTag",
  "Attachment",
  "MonthlyClosing",
  "DashboardPreference",
] as const;
type ModelName = (typeof backupModels)[number];
type Row = Record<string, unknown>;
type Table = {
  findMany: (args: {
    where: { userId?: string; transaction?: { userId: string } };
  }) => Promise<Row[]>;
  count: (args: { where: { userId: string } }) => Promise<number>;
  create: (args: { data: Row }) => Promise<Row>;
};
function table(db: Prisma.TransactionClient, model: ModelName): Table {
  return (db as unknown as Record<string, Table>)[
    model[0].toLowerCase() + model.slice(1)
  ];
}
const definitions = Prisma.dmmf.datamodel.models;

function rowSchema(model: ModelName) {
  const definition = definitions.find((item) => item.name === model)!;
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const field of definition.fields.filter(
    (item) => item.kind !== "object" && item.name !== "userId",
  )) {
    let validator: z.ZodTypeAny;
    if (field.kind === "enum")
      validator = z.enum(
        Prisma.dmmf.datamodel.enums
          .find((item) => item.name === field.type)!
          .values.map((item) => item.name) as [string, ...string[]],
      );
    else if (field.type === "String")
      validator =
        field.name === "id" || field.name.endsWith("Id")
          ? z.string().uuid()
          : z.string().max(field.name === "notes" ? 1000 : 1000);
    else if (field.type === "DateTime") validator = z.coerce.date();
    else if (field.type === "Boolean") validator = z.boolean();
    else if (field.type === "Int")
      validator = z.number().int().min(-2147483648).max(2147483647);
    else if (field.type === "Decimal")
      validator = z.coerce
        .number()
        .finite()
        .min(-9999999999.99)
        .max(9999999999.99);
    else if (field.type === "Bytes")
      validator = z
        .string()
        .max(2800000)
        .regex(/^[A-Za-z0-9+/]*={0,2}$/)
        .transform((value) => new Uint8Array(Buffer.from(value, "base64")));
    else validator = z.unknown();
    if (field.isList) validator = z.array(validator).max(100);
    if (!field.isRequired) validator = validator.nullable().optional();
    if ((field.hasDefaultValue || field.isUpdatedAt) && field.name !== "id")
      validator = validator.optional();
    fields[field.name] = validator;
  }
  return z
    .object(fields)
    .strict()
    .superRefine((row, context) => {
      const problem = (path: string, message: string) =>
        context.addIssue({ code: "custom", path: [path], message });
      for (const key of [
        "amount",
        "limitAmount",
        "totalAmount",
        "targetAmount",
      ])
        if (
          key in row &&
          (Number(row[key]) <= 0 ||
            Math.abs(
              Number(row[key]) * 100 - Math.round(Number(row[key]) * 100),
            ) > 0.0001)
        )
          problem(
            key,
            "Valor positivo com ate duas casas decimais obrigatorio.",
          );
      for (const key of [
        "currentAmount",
        "currentValue",
        "investedAmount",
        "contribution",
      ])
        if (key in row && Number(row[key]) < 0)
          problem(key, "Valor negativo nao permitido.");
      for (const key of ["closingDay", "dueDay", "dayOfMonth", "recurrenceDay"])
        if (row[key] != null && (Number(row[key]) < 1 || Number(row[key]) > 31))
          problem(key, "Dia invalido.");
      if (
        row.month != null &&
        (Number(row.month) < 1 || Number(row.month) > 12)
      )
        problem("month", "Mes invalido.");
      if (
        row.year != null &&
        (Number(row.year) < 2000 || Number(row.year) > 2200)
      )
        problem("year", "Ano invalido.");
      if (
        row.invoiceMonth != null &&
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(row.invoiceMonth))
      )
        problem("invoiceMonth", "Fatura invalida.");
      for (const key of ["interval", "installmentNumber", "installmentTotal"])
        if (
          row[key] != null &&
          (Number(row[key]) < 1 || Number(row[key]) > 120)
        )
          problem(key, "Intervalo ou parcela invalida.");
      if (
        row.dayOfWeek != null &&
        (Number(row.dayOfWeek) < 0 || Number(row.dayOfWeek) > 6)
      )
        problem("dayOfWeek", "Dia da semana invalido.");
      if (
        row.chartMonths != null &&
        (Number(row.chartMonths) < 3 || Number(row.chartMonths) > 12)
      )
        problem("chartMonths", "Periodo do grafico invalido.");
      if (model === "Transfer" && row.fromAccountId === row.toAccountId)
        problem("toAccountId", "Escolha contas diferentes.");
      if (
        model === "Transaction" &&
        row.creditCardId &&
        (row.accountId || row.type !== "EXPENSE" || !row.invoiceMonth)
      )
        problem("creditCardId", "Compra de cartao invalida.");
      if (model === "Attachment") {
        if (
          !["image/jpeg", "image/png", "application/pdf"].includes(
            String(row.mimeType),
          )
        )
          problem("mimeType", "Formato invalido.");
        if (
          !(row.content instanceof Uint8Array) ||
          row.content.length !== row.size ||
          row.content.length > 2 * 1024 * 1024
        )
          problem("content", "Comprovante invalido.");
      }
    });
}
export function validateBackup(input: unknown) {
  const shape = Object.fromEntries(
    backupModels.map((model) => [model, z.array(rowSchema(model)).max(50000)]),
  );
  const backup = z
    .object({
      version: z.literal(1),
      exportedAt: z.coerce.date(),
      tables: z.object(shape).strict(),
    })
    .strict()
    .parse(input);
  const tables = backup.tables as Record<ModelName, Row[]>;
  for (const model of backupModels) {
    const rows = tables[model];
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (new Set(ids).size !== ids.length)
      throw new AppError(`IDs repetidos em ${model}.`, 400);
    const definition = definitions.find((item) => item.name === model)!;
    for (const relation of definition.fields.filter(
      (field) =>
        field.kind === "object" &&
        field.relationFromFields?.length &&
        field.type !== "User",
    )) {
      if (!backupModels.includes(relation.type as ModelName)) continue;
      const allowed = new Set(
        tables[relation.type as ModelName].map((row) => row.id),
      );
      for (const row of rows)
        for (const key of relation.relationFromFields ?? [])
          if (row[key] != null && !allowed.has(row[key]))
            throw new AppError(`Referencia invalida em ${model}.${key}.`, 400);
    }
  }
  return tables;
}
export async function exportBackup(userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const tables: Record<string, Row[]> = {};
      for (const model of backupModels) {
        const rows = await table(tx, model).findMany({
          where:
            model === "TransactionTag"
              ? { transaction: { userId } }
              : { userId },
        });
        tables[model] = rows.map((row) => {
          const { userId: _userId, ...data } = row;
          if (model === "Attachment")
            data.content = Buffer.from(data.content as Uint8Array).toString(
              "base64",
            );
          return data;
        });
      }
      return { version: 1, exportedAt: new Date().toISOString(), tables };
    },
    { isolationLevel: "RepeatableRead", timeout: 60000 },
  );
}
export async function restoreBackup(userId: string, input: unknown) {
  const tables = validateBackup(input);
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      for (const model of backupModels.filter(
        (model) =>
          ![
            "Category",
            "Tag",
            "DashboardPreference",
            "TransactionTag",
            "Attachment",
          ].includes(model),
      )) {
        if (await table(tx, model).count({ where: { userId } }))
          throw new AppError(
            "A restauracao exige uma conta sem dados financeiros. Exporte seus dados atuais antes de usar outra conta vazia.",
            409,
          );
      }
      const idMap = new Map<string, string>();
      for (const model of backupModels)
        for (const row of tables[model])
          if (typeof row.id === "string") idMap.set(row.id, randomUUID());
      let restored = 0;
      for (const model of backupModels) {
        const definition = definitions.find((item) => item.name === model)!;
        const foreignKeys = definition.fields
          .filter((field) => field.kind === "object")
          .flatMap((field) => field.relationFromFields ?? [])
          .filter((key) => key !== "userId");
        for (const original of tables[model]) {
          const row = { ...original };
          if (typeof row.id === "string") row.id = idMap.get(row.id);
          for (const key of foreignKeys)
            if (typeof row[key] === "string")
              row[key] = idMap.get(row[key] as string);
          if (model !== "TransactionTag") row.userId = userId;
          if (model === "Category" || model === "Tag") {
            const existing =
              model === "Category"
                ? await tx.category.findFirst({
                    where: { userId, name: String(row.name) },
                  })
                : await tx.tag.findFirst({
                    where: { userId, name: String(row.name) },
                  });
            if (existing) {
              if (
                model === "Category" &&
                "type" in existing &&
                existing.type !== row.type
              )
                throw new AppError(
                  "Categoria existente com tipo diferente. Renomeie antes de restaurar.",
                  409,
                );
              idMap.set(original.id as string, existing.id);
              continue;
            }
          }
          if (model === "DashboardPreference") {
            const { id: _id, ...data } = row;
            await tx.dashboardPreference.upsert({
              where: { userId },
              create:
                data as unknown as Prisma.DashboardPreferenceUncheckedCreateInput,
              update:
                data as unknown as Prisma.DashboardPreferenceUncheckedUpdateInput,
            });
          } else await table(tx, model).create({ data: row });
          restored++;
        }
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: "RESTORE",
          resource: "BACKUP",
          details: { restored },
        },
      });
      return { restored };
    },
    { timeout: 120000, isolationLevel: "Serializable" },
  );
}
