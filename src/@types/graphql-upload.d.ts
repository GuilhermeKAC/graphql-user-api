declare module "graphql-upload/GraphQLUpload.mjs" {
  import type { GraphQLScalarType } from "graphql";
  const GraphQLUpload: GraphQLScalarType;
  export default GraphQLUpload;
}

declare module "graphql-upload/graphqlUploadExpress.mjs" {
  import type { RequestHandler } from "express";
  function graphqlUploadExpress(options?: { maxFileSize?: number; maxFiles?: number }): RequestHandler;
  export default graphqlUploadExpress;
}
