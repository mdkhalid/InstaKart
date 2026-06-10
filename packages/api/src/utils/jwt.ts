import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "fallback_access_secret_change_me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret_change_me";

export const signAccessToken = (userId: string, role: string, storeId?: string | null): string => {
  const payload: any = { userId, role };
  if (storeId) payload.storeId = storeId;
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

export const signRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): { userId: string; role: string; storeId?: string } => {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string; role: string; storeId?: string };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
};
