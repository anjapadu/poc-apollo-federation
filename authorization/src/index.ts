import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import awsLambdaFastify from '@fastify/aws-lambda';

const app = fastify({ logger: true });

type PermissionMapping = {
  [module: string]: {
    permission: string;
  };
};

const rolePermissionMapping: Record<string, PermissionMapping> = {
  DEALER_GROUP_ADMIN: {
    UserModule: { permission: '1111' }, // Full access
    BillingModule: { permission: '1111' }, // Full access
  },
  DEALER_GROUP_MEMBER: {
    UserModule: { permission: '0010' },
    BillingModule: { permission: '0010' },
  },
};

interface AuthorizationHeader {
  authorization?: string;
}

app.get(
  '/health',
  async (request: FastifyRequest<{ Headers: AuthorizationHeader }>, reply: FastifyReply) => {
    reply.status(200).send({ healthy: true });
  }
);

app.post(
  '/authorize',
  async (request: FastifyRequest<{ Headers: AuthorizationHeader }>, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      let permissions;
      console.log({ authHeader });
      if (authHeader) {
        permissions = rolePermissionMapping[authHeader];
      }
      console.log({ permissions });
      reply.send({
        isAuthorized: true,
        resolverContext: {
          authContext: {
            status: permissions ? 'UNAUTHED' : 'AUTHED',
            permissions,
          },
        },
        ttlOverride: 300,
      });
    } catch (error) {
      app.log.error({ error });
      reply.status(500).send({ message: 'Internal Server Error' });
    }
  }
);

export const handler =
  process.env.NODE_ENV === 'production'
    ? awsLambdaFastify(app)
    : {};

if (process.env.NODE_ENV !== 'production') {
  (async () => {
    console.log('Starting Local Run...');
    const PORT = Number(process.env.PORT) || 4100;

    try {
      await app.listen({ port: PORT, host: '0.0.0.0' });
      console.log(`🚀 Local server ready at http://localhost:${PORT}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  })();
}
