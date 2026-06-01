import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.toLowerCase() === "true";
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.73:5173"),
  APP_URL: z.string().url().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Financas Pessoais <no-reply@financas.local>"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ENABLE_API_DOCS: booleanFromEnv.default(false),
  ENABLE_DEV_PASSWORD_RESET_LINKS: booleanFromEnv.default(false),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  PORT: z.coerce.number().default(3333)
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") return;

  if (!value.APP_URL.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["APP_URL"], message: "APP_URL deve usar HTTPS em producao." });
  }

  if (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASS) {
    context.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "SMTP deve estar configurado em producao." });
  }
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  IS_PRODUCTION: parsedEnv.NODE_ENV === "production",
  CORS_ORIGINS: parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
};
