import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import GraphQLUpload from "graphql-upload/GraphQLUpload.js";

export const scalarResolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Upload: GraphQLUpload,
};