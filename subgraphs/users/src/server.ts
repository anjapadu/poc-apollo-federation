import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { gql } from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { authDirective } from "./utils/authDirective.js";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";

const { authDirectiveTransformer, authDirectiveTypeDefs } = authDirective("auth");

interface User {
  id: string;
  username: string;
}

const typeDefs = gql`
  ${authDirectiveTypeDefs}
  
  extend type Notification @key(fields: "id") {
    id: ID! @external
  }

  type Account @key(fields: "id") {
    id: ID!
    name: String
  }

  type Vehicle @key(fields: "id") {
    id: ID!
    make: String
    model: String
    year: Int
  }

  type Device @key(fields: "id") {
    id: ID!
    imei: String
  }

  type Query {
    me: User
    meAuth: User @auth(module: "UserModule", requiredPermissions: "0010")
    healthCheck: String!
  }

  type User @key(fields: "id") {
    id: ID!
    username: String
    notifications: [Notification!]! @external
  }
`;

const fetchUserById = (id: string): User | undefined => {
  const users = [
    { id: "1", username: "@ava" },
    { id: "2", username: "@bee" },
  ];
  return users.find((user) => user.id === id);
};

const resolvers = {
  Query: {
    me: () => ({ id: "1", username: "@ava" }),
    meAuth: () => ({ id: "1", username: "@ava" }),
    healthCheck: () => 'Healthy'
  },
  User: {
    __resolveReference(user: { id: string }, context: { fetchUserById: (id: string) => User | undefined }) {
      return context.fetchUserById(user.id);
    },
  },
};

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
        } else if (responseContext.response.body.kind === 'incremental') {
          console.log('Incremental response received.');
        }
      },
    };
  },
};

export const server = new ApolloServer({
  schema: authDirectiveTransformer(buildSubgraphSchema([{ typeDefs, resolvers }])),
  plugins: [loggingPlugin, ApolloServerPluginLandingPageLocalDefault({ embed: true })],
  introspection: true
});


export const buildContext = (authContextHeader?: string) => {
  const authContext = authContextHeader && typeof authContextHeader === 'string'
    ? JSON.parse(authContextHeader)
    : null;
  return {
    fetchUserById,
    authContext
  };
};
