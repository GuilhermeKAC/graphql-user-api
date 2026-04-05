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