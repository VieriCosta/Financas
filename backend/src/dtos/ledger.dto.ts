import { z } from "zod";

export const amount = z.coerce
  .number()
  .finite()
  .positive()
  .max(9999999999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001,
    "Use no maximo duas casas decimais.",
  );
export const accountDto = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().max(120).optional(),
  openingBalance: z.coerce
    .number()
    .finite()
    .min(-9999999999.99)
    .max(9999999999.99)
    .default(0),
  archived: z.boolean().default(false),
});
export const transferDto = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount,
    date: z.coerce.date(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (value) => value.fromAccountId !== value.toAccountId,
    "Escolha contas diferentes.",
  );
export const cardDto = z.object({
  name: z.string().trim().min(2).max(80),
  limitAmount: amount,
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  archived: z.boolean().default(false),
});
export const purchaseDto = z.object({
  description: z.string().trim().min(2).max(160),
  totalAmount: amount,
  installments: z.coerce.number().int().min(1).max(120),
  date: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
});
export const invoiceMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine(
    (value) =>
      Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2200,
  );
export const paymentDto = z.object({
  accountId: z.string().uuid(),
  invoiceMonth,
  amount,
  date: z.coerce.date(),
});
export const periodDto = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});
