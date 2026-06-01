import { z } from "zod";

export const updateProfileDto = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  currentPassword: z.string().min(8).max(72).optional()
});

export const updateProfilePasswordDto = z.object({
  currentPassword: z.string().min(8).max(72),
  newPassword: z.string().min(8).max(72)
});
