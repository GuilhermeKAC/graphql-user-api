import type { QueryResolvers, MutationResolvers, PostResolvers, CommentResolvers } from "../generated/types.js";

export const postQueryResolvers: Pick<QueryResolvers, "post" | "posts" | "comments"> = {
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
  createPost: (_parent, { data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    return prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published ?? false,
        authorId: user.id,
      },
    });
  },

  updatePost: async (_parent, { id, data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new Error("Post não encontrado");
    if (post.authorId !== user.id && user.role !== "ADMIN") {
      throw new Error("Sem permissão");
    }

    return prisma.post.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.content != null && { content: data.content }),
        ...(data.published != null && { published: data.published }),
      },
    });
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

  createComment: (_parent, { data }, { user, prisma }) => {
    if (!user) throw new Error("Não autenticado");

    return prisma.comment.create({
      data: { content: data.content, postId: data.postId, authorId: user.id },
    });
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
  author: (parent, _args, { prisma }) => {
    return prisma.user.findUniqueOrThrow({ where: { id: parent.authorId } });
  },

  comments: (parent, _args, { prisma }) => {
    return prisma.comment.findMany({ where: { postId: parent.id } });
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
  author: (parent, _args, { prisma }) => {
    return prisma.user.findUniqueOrThrow({ where: { id: parent.authorId } });
  },

  post: (parent, _args, { prisma }) => {
    return prisma.post.findUniqueOrThrow({ where: { id: parent.postId } });
  },
};