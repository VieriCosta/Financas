import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { aiRoutes } from "./routes/ai.routes.js";
import { financeRoutes } from "./routes/finance.routes.js";
import { profileRoutes } from "./routes/profile.routes.js";
import { ledgerRoutes } from "./routes/ledger.routes.js";

export const app = express();

if (env.TRUST_PROXY > 0) {
  app.set("trust proxy", env.TRUST_PROXY);
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-CSRF-Token",
    "Cache-Control",
    "Pragma",
    "Expires",
    "X-Filename"
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400
};

function isAllowedOrigin(origin: string) {
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const normalizedOrigin = parsedOrigin.origin.toLowerCase();

  if (!env.IS_PRODUCTION && isLocalHostname(parsedOrigin.hostname)) return true;

  return env.CORS_ORIGINS.some((allowedOrigin) => {
    try {
      return new URL(allowedOrigin).origin.toLowerCase() === normalizedOrigin;
    } catch {
      return false;
    }
  });
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
    || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use(morgan(env.IS_PRODUCTION ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
if (!env.IS_PRODUCTION || env.ENABLE_API_DOCS) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", financeRoutes);
app.use("/api", ledgerRoutes);

app.use(errorHandler);
