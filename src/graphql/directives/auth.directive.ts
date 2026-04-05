import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { defaultFieldResolver, GraphQLSchema } from "graphql";
import type { GraphQLContext } from "../context/index.js";

const ROLE_HIERARCHY: Record<string, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export function applyAuthDirective(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, "auth")?.[0];

      if (!directive) return fieldConfig;

      const requires = (directive["requires"] as string | undefined) ?? "USER";
      const { resolve = defaultFieldResolver } = fieldConfig;

      return {
        ...fieldConfig,
        resolve: async (source, args, context: GraphQLContext, info) => {
          if (!context.user) {
            throw new Error("Não autenticado");
          }

          const userLevel = ROLE_HIERARCHY[context.user.role] ?? 0;
          const requiredLevel = ROLE_HIERARCHY[requires] ?? 0;

          if (userLevel < requiredLevel) {
            throw new Error(`Sem permissão. Requer role: ${requires}`);
          }

          return resolve(source, args, context, info);
        },
      };
    },
  });
}