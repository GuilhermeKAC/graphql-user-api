import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/graphql/schema/**/*.graphql",
  generates: {
    "src/graphql/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context/index#GraphQLContext",
        scalars: {
          DateTime: "Date",
          Upload: "Promise<import('graphql-upload/processRequest.js').FileUpload>",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;