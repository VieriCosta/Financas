import { z } from "zod";

export const registerDto = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const forgotPasswordDto = z.object({
  email: z.string().email()
});

export const resetPasswordDto = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});
