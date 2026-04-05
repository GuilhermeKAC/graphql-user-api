import DataLoader from "dataloader";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { User, Post, Comment } from "../../generated/prisma/client.js";

// Carrega usuários em batch por ID
function createUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, User | null>(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => userMap.get(id) ?? null);
  });
}

// Carrega posts em batch por ID
function createPostLoader(prisma: PrismaClient) {
  return new DataLoader<string, Post | null>(async (ids) => {
    const posts = await prisma.post.findMany({
      where: { id: { in: [...ids] } },
    });

    const postMap = new Map(posts.map((p) => [p.id, p]));
    return ids.map((id) => postMap.get(id) ?? null);
  });
}

// Carrega comentários em batch por postId
function createCommentsByPostLoader(prisma: PrismaClient) {
  return new DataLoader<string, Comment[]>(async (postIds) => {
    const comments = await prisma.comment.findMany({
      where: { postId: { in: [...postIds] } },
      orderBy: { createdAt: "asc" },
    });

    const commentMap = new Map<string, Comment[]>();
    for (const comment of comments) {
      const list = commentMap.get(comment.postId) ?? [];
      list.push(comment);
      commentMap.set(comment.postId, list);
    }

    return postIds.map((id) => commentMap.get(id) ?? []);
  });
}

export function createLoaders(prisma: PrismaClient) {
  return {
    user: createUserLoader(prisma),
    post: createPostLoader(prisma),
    commentsByPost: createCommentsByPostLoader(prisma),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;