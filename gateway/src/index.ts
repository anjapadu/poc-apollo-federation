import { buildContext, server } from './server.js';
import { startStandaloneServer } from '@apollo/server/standalone';
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";

if (process.env.NODE_ENV !== "production") {
  (async () => {
    console.log("Starting Local Run...");
    const port = Number(process.env.PORT) || 8080;
    const { url } = await startStandaloneServer(server, {
      listen: { port },
      context: async ({ req }) => {
        const token = req.headers.authorization;
        return buildContext(token);
      },
    });
    console.log(`🚀 Local server ready at ${url}`);
  })();
}

export const handler =
  process.env.NODE_ENV === "production"
    ? startServerAndCreateLambdaHandler(
      // @ts-ignore
      server,
      handlers.createAPIGatewayProxyEventV2RequestHandler(),
      {
        context: async ({ event }: { event: any }) => {
          const token = event.headers.authorization;
          return buildContext(token);
        },
      }
    )
    : {};
