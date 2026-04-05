import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/graphql/schema/**/*.graphql",
  generates: {
    "src/graphql/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        useTypeImports: true,
        contextType: "../context/index.js#GraphQLContext",
        mappers: {
          User: "../../generated/prisma/client.js#User as PrismaUser",
          Post: "../../generated/prisma/client.js#Post as PrismaPost",
          Comment: "../../generated/prisma/client.js#Comment as PrismaComment",
        },
        scalars: {
          DateTime: "Date",
          Upload: "unknown",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;