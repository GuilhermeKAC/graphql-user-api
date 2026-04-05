import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { schema } from "./graphql/schema/index.js";
import { createContext } from "./graphql/context/index.js";

const server = new ApolloServer({ schema });

const port = Number(process.env["PORT"] ?? 4000);

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => createContext(req),
  listen: { port },
});

console.log(`🚀 GraphQL API rodando em ${url}`);