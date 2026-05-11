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
import { financeRoutes } from "./routes/finance.routes.js";

export const app = express();

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
    "Cache-Control",
    "Pragma",
    "Expires"
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400
};

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = origin.toLowerCase();

  if (
    normalizedOrigin.includes("localhost") ||
    normalizedOrigin.includes("127.0.0.1") ||
    normalizedOrigin.includes("192.168.") ||
    normalizedOrigin.includes("172.") ||
    normalizedOrigin.includes("10.") ||
    normalizedOrigin.endsWith(".vercel.app") ||
    normalizedOrigin.endsWith(".onrender.com")
  ) {
    return true;
  }

  return env.CORS_ORIGINS.some((allowedOrigin) => {
    const normalizedAllowedOrigin = allowedOrigin.toLowerCase();

    if (normalizedAllowedOrigin === normalizedOrigin) {
      return true;
    }

    if (normalizedAllowedOrigin.includes("*")) {
      const pattern = new RegExp(`^${normalizedAllowedOrigin.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("\\*", ".*")}$`);
      return pattern.test(normalizedOrigin);
    }

    return false;
  });
}

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api", financeRoutes);

app.use(errorHandler);
