import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { loadTypedefsSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import path from 'path';
import { DateTimeResolver } from 'graphql-scalars';
import { DocumentNode } from "graphql";
import { mergeTypeDefs } from '@graphql-tools/merge';
import { fileURLToPath } from 'url';
import { authDirective } from "./utils/authDirective.js";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);
const { authDirectiveTransformer, authDirectiveTypeDefs } = authDirective("auth");

const loadedTypedefs = loadTypedefsSync(path.join(currentDirname, './**/*.graphql'), {
  loaders: [new GraphQLFileLoader()],
});

const typeDefs = mergeTypeDefs(
  loadedTypedefs
    .map((source) => source.document)
    .filter((doc): doc is DocumentNode => doc !== undefined)
);


const loggingPlugin: ApolloServerPlugin = {
  async requestDidStart(requestContext) {
    if (requestContext.request.operationName === 'IntrospectionQuery') {
      return;
    }
    console.log('Request started:');
    console.log(`Query: ${requestContext.request.query}`);
    console.log(`Variables: ${JSON.stringify(requestContext.request.variables)}`);
    return {
      async willSendResponse(responseContext) {
        console.log('Response sent:');
        if (responseContext.response.body.kind === 'single') {
          console.log(`Data: ${JSON.stringify(responseContext.response.body.singleResult?.data)}`);
          if (responseContext.response.body.singleResult?.errors) {
            console.log(`Errors: ${JSON.stringify(responseContext.response.body.singleResult.errors)}`);
          }
        }
        else if (responseContext.response.body.kind === 'incremental') {
          console.log('Incremental response received.');
        }
      },
    };
  },
};

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    hello: () => "hello",
    healthCheck: () => "Healthy",
  },
};


export const server = new ApolloServer({
  schema: (buildSubgraphSchema([{ typeDefs, resolvers }])),
  plugins: [loggingPlugin, ApolloServerPluginLandingPageLocalDefault({ embed: true })],
  introspection: true
});


export const buildContext = (authContextHeader?: string) => {
  const authContext = authContextHeader && typeof authContextHeader === 'string'
    ? JSON.parse(authContextHeader)
    : null;
  return {
    authContext
  };
};
