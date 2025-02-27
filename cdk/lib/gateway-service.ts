import * as core from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface GatewayServiceProps {
  readonly ecrRepositoryName: string; // ECR repository for the gateway image
  readonly imageTag?: string; // Tag for the gateway image
  readonly usersEndpoint: string; // Subgraph URLs
  readonly billingEndpoint: string;
  readonly notificationsEndpoint: string;
  readonly authorizationEndpoint: string;
}

export class GatewayService extends Construct {
  readonly graphQLApiEndpoint: string;

  constructor(scope: Construct, id: string, props: GatewayServiceProps) {
    super(scope, id);

    // Reference the ECR repository
    const repository = ecr.Repository.fromRepositoryName(this, 'ECRRepo', props.ecrRepositoryName);

    const builtAt = 'last-' + new Date().toISOString();

    // Define the Lambda function using the Docker image
    const gatewayFunction = new lambda.DockerImageFunction(this, 'GatewayFunction', {
      code: lambda.DockerImageCode.fromEcr(repository, {
        tag: props.imageTag || 'latest',
      }),
      environment: {
        USERS: props.usersEndpoint,
        BILLING: props.billingEndpoint,
        NOTIFICATIONS: props.notificationsEndpoint,
        AUTHORIZATION: props.authorizationEndpoint,
        BUILT_AT: builtAt,
      },
      timeout: core.Duration.seconds(30),
    });

    // Define the API Gateway HTTP endpoint
    const httpApi = new apigatewayv2.HttpApi(this, 'GatewayHttpApi', {
      apiName: `ApolloGateway`,
      description: 'Apollo Gateway for federated GraphQL services',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.GET,
        ],
      },
    });

    // Integrate the Lambda function with the API Gateway
    const lambdaIntegration = new integrations.HttpLambdaIntegration('LambdaIntegration', gatewayFunction);

    httpApi.addRoutes({
      path: '/graphql',
      methods: [apigatewayv2.HttpMethod.POST, apigatewayv2.HttpMethod.OPTIONS, apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // Expose the GraphQL API endpoint
    this.graphQLApiEndpoint = `${httpApi.url}graphql`;

    // Output the Gateway endpoint
    new core.CfnOutput(this, 'GraphQLApiEndpoint', {
      value: this.graphQLApiEndpoint,
      description: 'The GraphQL API endpoint for the Apollo Gateway',
    });
  }
}
