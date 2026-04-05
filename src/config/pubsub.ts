import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();

export default pubsub;

export const EVENTS = {
  POST_CREATED: "POST_CREATED",
  POST_UPDATED: "POST_UPDATED",
  COMMENT_ADDED: "COMMENT_ADDED",
} as const;