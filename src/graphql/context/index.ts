import type { IncomingMessage } from "http";
import prisma from "../../config/prisma.js";
import { verifyToken } from "../../utils/jwt.js";
import { createLoaders, type Loaders } from "./loaders.js";
import type { User } from "../../generated/prisma/client.js";

export interface GraphQLContext {
  prisma: typeof prisma;
  user: User | null;
  loaders: Loaders;
}

export async function createContext(req: IncomingMessage): Promise<GraphQLContext> {
  // Loaders são criados por requisição para garantir cache isolado
  const loaders = createLoaders(prisma);

  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { prisma, user: null, loaders };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return { prisma, user: null, loaders };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  return { prisma, user, loaders };
}
