import type { QueryResolvers, MutationResolvers, PostResolvers, CommentResolvers } from "../generated/types.js";
import pubsub, { EVENTS } from "../../config/pubsub.js";

// Converte ID para cursor base64
function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`).toString("base64");
}

// Converte cursor base64 de volta para ID
function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf8").replace("cursor:", "");
}

// Converte PostWhereInput do GraphQL para o formato do Prisma
function buildPrismaWhere(where: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!where) return {};

  const result: Record<string, unknown> = {};

  if (where["AND"]) {
    result["AND"] = (where["AND"] as unknown[]).map((w) => buildPrismaWhere(w as Record<string, unknown>));
  }
  if (where["OR"]) {
    result["OR"] = (where["OR"] as unknown[]).map((w) => buildPrismaWhere(w as Record<string, unknown>));
  }
  if (where["NOT"]) {
    result["NOT"] = buildPrismaWhere(where["NOT"] as Record<string, unknown>);
  }
  if (where["title"]) result["title"] = where["title"];
  if (where["published"]) result["published"] = (where["published"] as Record<string, unknown>)["equals"];
  if (where["authorId"]) result["authorId"] = where["authorId"];

  return result;
}

export const postQueryResolvers: Pick<QueryResolvers, "post" | "posts" | "postsConnection" | "comments"> = {
  post: (_parent, { id }, { prisma }) => {
    return prisma.post.findUnique({ where: { id } });
  },

  posts: (_parent, { filter, pagination }, { prisma }) => {
    return prisma.post.findMany({
      where: {
        ...(filter?.authorId != null && { authorId: filter.authorId }),
        ...(filter?.published != null && { published: filter.published }),
      },
      ...(pagination?.skip != null && { skip: pagination.skip }),
      ...(pagination?.take != null && { take: pagination.take }),
      orderBy: { createdAt: "desc" },
    });
  },

  postsConnection: async (_parent, { where, orderBy, first, after }, { prisma }) => {
    const take = first ?? 10;
    const cursor = after ? decodeCursor(after) : undefined;
    const prismaWhere = buildPrismaWhere(where as Record<string, unknown> | null);

    const orderByField = orderBy?.createdAt ?? orderBy?.title ?? "desc";
    const orderByKey = orderBy?.createdAt ? "createdAt" : orderBy?.title ? "title" : "createdAt";

    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where: prismaWhere,
        orderBy: { [orderByKey]: orderByField },
        take: take + 1, // busca um a mais para saber se há próxima página
        ...(cursor != null && {
          cursor: { id: cursor },
          skip: 1, // pula o cursor
        }),
      }),
      prisma.post.count({ where: prismaWhere }),
    ]);

    const hasNextPage = posts.length > take;
    const nodes = hasNextPage ? posts.slice(0, take) : posts;

    const edges = nodes.map((post) => ({
      cursor: encodeCursor(post.id),
      node: post,
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor != null,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
    };
  },

  comments: (_parent, { postId, pagination }, { prisma }) => {
    return prisma.comment.findMany({
      where: { postId },
      ...(pagination?.skip != null && { skip: pagination.skip }),
      ...(pagination?.take != null && { take: pagination.take }),
      orderBy: { createdAt: "asc" },
    });
  },
};

export const postMutationResolvers: Pick<
  MutationResolvers,
  "createPost" | "updatePost" | "deletePost" | "likePost" | "unlikePost" | "createComment" | "deleteComment"
> = {
  createPost: async (_parent, { data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published ?? false,
        authorId: user.id,
      },
    });

    await pubsub.publish(EVENTS.POST_CREATED, post);
    return post;
  },

  updatePost: async (_parent, { id, data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new Error("Post não encontrado");
    if (post.authorId !== user.id && user.role !== "ADMIN") {
      throw new Error("Sem permissão");
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.content != null && { content: data.content }),
        ...(data.published != null && { published: data.published }),
      },
    });

    await pubsub.publish(EVENTS.POST_UPDATED, updated);
    return updated;
  },

  deletePost: async (_parent, { id }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new Error("Post não encontrado");
    if (post.authorId !== user.id && user.role !== "ADMIN") {
      throw new Error("Sem permissão");
    }

    await prisma.post.delete({ where: { id } });
    return true;
  },

  likePost: async (_parent, { postId }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");
    await prisma.like.create({ data: { userId: user.id, postId } });
    return true;
  },

  unlikePost: async (_parent, { postId }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");
    await prisma.like.delete({
      where: { userId_postId: { userId: user.id, postId } },
    });
    return true;
  },

  createComment: async (_parent, { data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const comment = await prisma.comment.create({
      data: { content: data.content, postId: data.postId, authorId: user.id },
    });

    await pubsub.publish(`${EVENTS.COMMENT_ADDED}.${data.postId}`, comment);
    return comment;
  },

  deleteComment: async (_parent, { id }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Comentário não encontrado");
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
      throw new Error("Sem permissão");
    }

    await prisma.comment.delete({ where: { id } });
    return true;
  },
};

export const postFieldResolvers: PostResolvers = {
  // DataLoader: agrupa todas as buscas de author em uma query IN
  author: async (parent, _args, { loaders }) => {
    const user = await loaders.user.load(parent.authorId);
    if (!user) throw new Error("Autor não encontrado");
    return user;
  },

  // DataLoader: agrupa todos os comentários por post em uma query IN
  comments: (parent, _args, { loaders }) => {
    return loaders.commentsByPost.load(parent.id);
  },

  likesCount: (parent, _args, { prisma }) => {
    return prisma.like.count({ where: { postId: parent.id } });
  },

  likedByMe: async (parent, _args, { user, prisma }) => {
    if (!user) return false;
    const like = await prisma.like.findUnique({
      where: { userId_postId: { userId: user.id, postId: parent.id } },
    });
    return !!like;
  },
};

export const commentFieldResolvers: CommentResolvers = {
  // DataLoader: agrupa todas as buscas de author em uma query IN
  author: async (parent, _args, { loaders }) => {
    const user = await loaders.user.load(parent.authorId);
    if (!user) throw new Error("Autor não encontrado");
    return user;
  },

  // DataLoader: agrupa todas as buscas de post em uma query IN
  post: async (parent, _args, { loaders }) => {
    const post = await loaders.post.load(parent.postId);
    if (!post) throw new Error("Post não encontrado");
    return post;
  },
};