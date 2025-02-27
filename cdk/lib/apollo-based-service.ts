import * as core from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface ApolloBasedServiceProps {
  readonly serviceName: string;
  readonly ecrRepositoryName: string;
  readonly imageTag?: string;
}

export class ApolloBasedService extends Construct {
  readonly graphQLApiEndpoint: string;

  constructor(scope: Construct, id: string, props: ApolloBasedServiceProps) {
    super(scope, id);

    const repository = ecr.Repository.fromRepositoryName(this, 'ECRRepo', props.ecrRepositoryName);

    const builtAt = 'last-' + new Date().toISOString();
    const apolloServer = new lambda.DockerImageFunction(this, `ApolloServer`, {
      code: lambda.DockerImageCode.fromEcr(repository, {
        tag: props.imageTag || 'latest',
      }),
      environment: {
        BUILT_AT: builtAt,
      },
      timeout: core.Duration.seconds(30),
    });

    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${props.serviceName} graphql subgraph`,
      description: `This service serves ${props.serviceName} data through Apollo GraphQL`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS, apigatewayv2.CorsHttpMethod.GET],
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration('LambdaIntegration', apolloServer);

    httpApi.addRoutes({
      path: '/graphql',
      methods: [apigatewayv2.HttpMethod.POST, apigatewayv2.HttpMethod.OPTIONS, apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    this.graphQLApiEndpoint = httpApi.apiEndpoint;
  }
}
