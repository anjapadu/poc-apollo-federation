
import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
const gateway = new ApolloGateway({
  debug: true,
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "users", url: process.env.USERS },
      { name: "billing", url: process.env.BILLING },
      { name: "notifications", url: process.env.NOTIFICATIONS }
    ],
  }),
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        if (context.authContext) {
          request.http?.headers.set("x-auth-context", JSON.stringify(context.authContext));
        }
      },
    });
  },
});



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
export const server = new ApolloServer({
  gateway,
  introspection: true,
  plugins: [loggingPlugin,
    ApolloServerPluginLandingPageLocalDefault({ embed: true })]
});

export const buildContext = async (token?: string) => {
  if (!token) return {};
  try {
    const response = await fetch(`${process.env.AUTHORIZATION}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: token },
      body: JSON.stringify({}),
    });

    const { resolverContext } = await response.json();
    return { authContext: resolverContext?.authContext };
  } catch (error) {
    console.error("Error fetching auth context:", error);
    return {};
  }
};
