import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  const secret = process.env["JWT_SECRET"] ?? "";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env["JWT_SECRET"] ?? "";
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}