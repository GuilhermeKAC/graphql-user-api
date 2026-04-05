import bcrypt from "bcryptjs";
import type { MutationResolvers } from "../generated/types.js";
import { signToken } from "../../utils/jwt.js";

export const authMutationResolvers: Pick<MutationResolvers, "login" | "register"> = {
  login: async (_parent, { email, password }, { prisma }) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("Credenciais inválidas");
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error("Credenciais inválidas");
    }

    return { token: signToken(user.id), user };
  },

  register: async (_parent, { data }, { prisma }) => {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });

    if (existing) {
      throw new Error("E-mail já cadastrado");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role ?? "USER",
      },
    });

    return { token: signToken(user.id), user };
  },
};