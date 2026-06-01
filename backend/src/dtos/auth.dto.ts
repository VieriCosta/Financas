import { z } from "zod";

export const registerDto = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72)
});

export const loginDto = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72)
});

export const forgotPasswordDto = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase())
});

export const resetPasswordDto = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(72)
});
