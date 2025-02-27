import { GraphQLFieldConfig, GraphQLSchema, defaultFieldResolver } from "graphql";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";

interface AuthDirectiveArgs {
  module: string;
  requiredPermissions: string;
}

export const authDirective = (directiveName: string) => ({
  authDirectiveTypeDefs: `
    directive @${directiveName}(module: String!, requiredPermissions: String!) on FIELD_DEFINITION
  `,
  authDirectiveTransformer: (schema: GraphQLSchema): GraphQLSchema => {
    return mapSchema(schema, {
      [MapperKind.FIELD as string]: (fieldConfig: GraphQLFieldConfig<any, any>): GraphQLFieldConfig<any, any> | null => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0] as AuthDirectiveArgs | undefined;

        if (directive) {
          const { module, requiredPermissions } = directive;
          const originalResolve = fieldConfig.resolve || defaultFieldResolver;

          fieldConfig.resolve = async (source, args, context, info) => {
            const { authContext } = context;
            if (!authContext) {
              throw new Error("Unauthorized");
            }

            const userPermissions = authContext.permissions?.[module]?.permission;
            if (
              !userPermissions ||
              (parseInt(userPermissions, 2) & parseInt(requiredPermissions, 2)) === 0
            ) {
              throw new Error("Forbidden");
            }

            return originalResolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  },
});
