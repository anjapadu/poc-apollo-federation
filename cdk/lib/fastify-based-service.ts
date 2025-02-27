import * as core from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface FastifyServiceProps {
  readonly serviceName: string;
  readonly ecrRepositoryName: string;
  readonly imageTag?: string;
}

export class FastifyService extends Construct {
  readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: FastifyServiceProps) {
    super(scope, id);

    // Reference your ECR repository where the Fastify image is pushed
    const repository = ecr.Repository.fromRepositoryName(this, 'ECRRepo', props.ecrRepositoryName);

    // Just an example environment variable
    const builtAt = 'last-' + new Date().toISOString();
    const fastifyFunction = new lambda.DockerImageFunction(this, `FastifyFunction`, {
      code: lambda.DockerImageCode.fromEcr(repository, {
        tag: props.imageTag || 'latest',
      }),
      environment: {
        BUILT_AT: builtAt,
      },
      timeout: core.Duration.seconds(30),
    });

    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${props.serviceName}-http`,
      description: `This service is built with Fastify`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration('LambdaIntegration', fastifyFunction);
    httpApi.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    httpApi.addRoutes({
      path: '/authorize',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: lambdaIntegration,
    });

    this.apiEndpoint = httpApi.apiEndpoint;
  }
}
