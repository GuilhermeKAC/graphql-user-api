import bcrypt from "bcryptjs";
import type { QueryResolvers, MutationResolvers, UserResolvers } from "../generated/types.js";

export const userQueryResolvers: Pick<QueryResolvers, "me" | "user" | "users"> = {
  me: (_parent, _args, { user }) => {
    if (!user) throw new Error("Não autenticado");
    return user;
  },

  user: (_parent, { id }, { prisma }) => {
    return prisma.user.findUnique({ where: { id } });
  },

  users: (_parent, { filter, pagination }, { prisma }) => {
    return prisma.user.findMany({
      where: {
        ...(filter?.name != null && { name: filter.name }),
        ...(filter?.email != null && { email: filter.email }),
        ...(filter?.role != null && { role: filter.role }),
      },
      ...(pagination?.skip != null && { skip: pagination.skip }),
      ...(pagination?.take != null && { take: pagination.take }),
    });
  },
};

export const userMutationResolvers: Pick<
  MutationResolvers,
  "createUser" | "updateUser" | "deleteUser" | "followUser" | "unfollowUser" | "uploadProfilePicture"
> = {
  createUser: async (_parent, { data }, { prisma }) => {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("E-mail já cadastrado");

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role ?? "USER",
      },
    });
  },

  updateUser: async (_parent, { data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    return prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.email != null && { email: data.email }),
        ...(data.profilePicture != null && { profilePicture: data.profilePicture }),
        ...(data.password != null && { password: await bcrypt.hash(data.password, 10) }),
      },
    });
  },

  deleteUser: async (_parent, _args, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");
    await prisma.user.delete({ where: { id: user.id } });
    return true;
  },

  followUser: async (_parent, { userId }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");
    if (user.id === userId) throw new Error("Você não pode seguir a si mesmo");

    await prisma.follow.create({
      data: { followerId: user.id, followingId: userId },
    });
    return true;
  },

  unfollowUser: async (_parent, { userId }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId: user.id, followingId: userId },
      },
    });
    return true;
  },

  uploadProfilePicture: async (_parent, { file }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const { createWriteStream } = await import("fs");
    const { filename, createReadStream } = (await file) as FileUpload;
    const uploadDir = process.env["UPLOAD_DIR"] ?? "./uploads";
    const filePath = `${uploadDir}/${user.id}-${filename}`;

    await new Promise<void>((resolve, reject) => {
      createReadStream()
        .pipe(createWriteStream(filePath))
        .on("finish", resolve)
        .on("error", reject);
    });

    return prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: filePath },
    });
  },
};

export const userFieldResolvers: UserResolvers = {
  posts: (parent, _args, { prisma }) => {
    return prisma.post.findMany({ where: { authorId: parent.id } });
  },

  comments: (parent, _args, { loaders }) => {
    return loaders.commentsByPost.load(parent.id);
  },

  followers: async (parent, _args, { prisma }) => {
    const follows = await prisma.follow.findMany({
      where: { followingId: parent.id },
      include: { follower: true },
    });
    return follows.map((f) => f.follower);
  },

  following: async (parent, _args, { prisma }) => {
    const follows = await prisma.follow.findMany({
      where: { followerId: parent.id },
      include: { following: true },
    });
    return follows.map((f) => f.following);
  },

  likesCount: (parent, _args, { prisma }) => {
    return prisma.like.count({ where: { userId: parent.id } });
  },
};