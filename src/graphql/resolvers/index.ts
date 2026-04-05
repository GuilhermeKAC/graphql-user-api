import type { Resolvers } from "../generated/types.js";
import { scalarResolvers } from "./scalars.resolver.js";
import { authMutationResolvers } from "./auth.resolver.js";
import { userQueryResolvers, userMutationResolvers, userFieldResolvers } from "./user.resolver.js";
import { postQueryResolvers, postMutationResolvers, postFieldResolvers, commentFieldResolvers } from "./post.resolver.js";

export const resolvers: Resolvers = {
  ...scalarResolvers,

  Query: {
    ...userQueryResolvers,
    ...postQueryResolvers,
  },

  Mutation: {
    ...authMutationResolvers,
    ...userMutationResolvers,
    ...postMutationResolvers,
  },

  User: userFieldResolvers,
  Post: postFieldResolvers,
  Comment: commentFieldResolvers,
};