import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

const authCookieName = "finance.session";
const csrfCookieName = "finance.csrf";
const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;

const sharedCookieOptions = {
  secure: env.IS_PRODUCTION,
  sameSite: env.IS_PRODUCTION ? "none" as const : "lax" as const,
  path: "/"
};

function readCookie(req: Request, name: string) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((item) => item.trim().split("="))
    .find(([key]) => key === name);

  return cookie ? decodeURIComponent(cookie.slice(1).join("=")) : undefined;
}

export function getAuthToken(req: Request) {
  const cookieToken = readCookie(req, authCookieName);
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return cookieToken ?? bearerToken;
}

export function issueSessionCookies(res: Response, token: string) {
  const csrfToken = crypto.randomBytes(32).toString("hex");

  res.cookie(authCookieName, token, {
    ...sharedCookieOptions,
    httpOnly: true,
    maxAge: cookieMaxAge
  });
  res.cookie(csrfCookieName, csrfToken, {
    ...sharedCookieOptions,
    httpOnly: true,
    maxAge: cookieMaxAge
  });

  return csrfToken;
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(authCookieName, sharedCookieOptions);
  res.clearCookie(csrfCookieName, sharedCookieOptions);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = readCookie(req, csrfCookieName);
  const headerToken = req.header("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    throw new AppError("Token CSRF ausente ou invalido.", 403);
  }

  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    throw new AppError("Token CSRF ausente ou invalido.", 403);
  }

  next();
}
