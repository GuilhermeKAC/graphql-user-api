import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvers } from "../resolvers/index.js";
import { applyAuthDirective } from "../directives/auth.directive.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const typesArray = loadFilesSync(join(__dirname, "./**/*.graphql"));
const typeDefs = mergeTypeDefs(typesArray);

const baseSchema = makeExecutableSchema({ typeDefs, resolvers });

export const schema = applyAuthDirective(baseSchema);