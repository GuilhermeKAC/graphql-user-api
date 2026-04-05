import "dotenv/config";
import { createServer } from "http";
import { ApolloServer, HeaderMap } from "@apollo/server";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { schema } from "./graphql/schema/index.js";
import { createContext } from "./graphql/context/index.js";

const apolloServer = new ApolloServer({ schema });
await apolloServer.start();

const httpServer = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    });
    res.end();
    return;
  }

  // Lê o body da requisição
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as ArrayBuffer));
  }
  const bodyText = Buffer.concat(chunks).toString("utf8");

  // Monta os headers no formato do Apollo
  const headers = new HeaderMap();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const response = await apolloServer.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: req.method ?? "POST",
      headers,
      body: bodyText ? (JSON.parse(bodyText) as unknown) : null,
      search: req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "",
    },
    context: () => createContext(req),
  });

  // Escreve o status e headers da resposta
  res.writeHead(
    response.status ?? 200,
    Object.fromEntries(
      [...response.headers].map(([k, v]) => [k, v])
    )
  );

  // Escreve o body da resposta
  if (response.body.kind === "complete") {
    res.end(response.body.string);
  } else {
    for await (const chunk of response.body.asyncIterator) {
      res.write(chunk);
    }
    res.end();
  }
});

// Servidor WebSocket para subscriptions
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
useServer({
  schema,
  context: async (ctx) => {
    // O token JWT vem em connectionParams quando o cliente abre a conexão WS
    const token = (ctx.connectionParams?.["Authorization"] as string | undefined)
      ?? (ctx.connectionParams?.["authorization"] as string | undefined)
      ?? "";

    // Reutiliza a mesma lógica de contexto do HTTP, simulando um IncomingMessage
    const fakeReq = { headers: { authorization: token } } as import("http").IncomingMessage;
    return createContext(fakeReq);
  },
}, wsServer);

const port = Number(process.env["PORT"] ?? 4000);

httpServer.listen(port, () => {
  console.log(`🚀 GraphQL API rodando em http://localhost:${port}/graphql`);
  console.log(`📡 Subscriptions prontas em ws://localhost:${port}/graphql`);
});