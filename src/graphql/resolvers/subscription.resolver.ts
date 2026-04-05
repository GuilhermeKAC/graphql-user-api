import type { SubscriptionResolvers } from "../generated/types.js";
import type { Post as PrismaPost, Comment as PrismaComment } from "../../generated/prisma/client.js";
import pubsub, { EVENTS } from "../../config/pubsub.js";

export const subscriptionResolvers: SubscriptionResolvers = {
  postCreated: {
    subscribe: () => pubsub.asyncIterableIterator(EVENTS.POST_CREATED),
    resolve: (payload: PrismaPost) => payload,
  },

  postUpdated: {
    subscribe: () => pubsub.asyncIterableIterator(EVENTS.POST_UPDATED),
    resolve: (payload: PrismaPost) => payload,
  },

  commentAdded: {
    subscribe: (_parent, { postId }) =>
      pubsub.asyncIterableIterator(`${EVENTS.COMMENT_ADDED}.${postId}`),
    resolve: (payload: PrismaComment) => payload,
  },
};