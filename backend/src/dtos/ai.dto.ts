import { z } from "zod";

export const aiAdviceDto = z.object({
  message: z.string().trim().min(2).max(1000)
});

export const aiCommandPreviewDto = z.object({
  message: z.string().trim().min(2).max(1000)
});

export const aiCommandConfirmDto = z.object({
  confirmationToken: z.string().min(20)
});
