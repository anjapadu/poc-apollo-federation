import * as core from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { ApolloBasedService } from './apollo-based-service';
import { FastifyService } from './fastify-based-service';
import { GatewayService } from './gateway-service';

export class SubgraphsStack extends core.Stack {
  constructor(scope: Construct, id: string, props?: core.StackProps) {
    super(scope, id, props);
    const usersRepo = new ecr.Repository(this, 'UsersECRRepository', {
      repositoryName: 'users-service-repo',
      lifecycleRules: [
        {
          maxImageCount: 1
        },
      ],
    });
    const notificationsRepo = new ecr.Repository(this, 'NotificationsECRRepository', {
      repositoryName: 'notifications-service-repo',
      lifecycleRules: [
        {
          maxImageCount: 1
        },
      ],
    });
    const billingRepo = new ecr.Repository(this, 'BillingECRRepository', {
      repositoryName: 'billing-service-repo',
      lifecycleRules: [
        {
          maxImageCount: 1
        },
      ],
    });
    const authorizationRepo = new ecr.Repository(this, 'AuthorizationECRRepository', {
      repositoryName: 'authorization-service-repo',
      lifecycleRules: [
        {
          maxImageCount: 1
        },
      ],
    });
    const gatewayRepo = new ecr.Repository(this, 'GatewayECRRepository', {
      repositoryName: 'gateway-service-repo',
      lifecycleRules: [
        {
          maxImageCount: 1
        },
      ],
    });
    new core.CfnOutput(this, 'UsersRepoUri', {
      value: usersRepo.repositoryUri,
      description: 'URI of the users ECR repository',
    });
    new core.CfnOutput(this, 'AuthorizationRepoUri', {
      value: authorizationRepo.repositoryUri,
      description: 'URI of the authorization ECR repository',
    });
    new core.CfnOutput(this, 'BillingRepoUri', {
      value: billingRepo.repositoryUri,
      description: 'URI of the billing ECR repository',
    });
    new core.CfnOutput(this, 'NotificationsRepoUri', {
      value: notificationsRepo.repositoryUri,
      description: 'URI of the notifications ECR repository',
    });
    new core.CfnOutput(this, 'GatewayRepoUri', {
      value: gatewayRepo.repositoryUri,
      description: 'URI of the gateway ECR repository',
    });
    /******* */
    /******* */
    /******* */
    const usersService = new ApolloBasedService(this, 'UsersService', {
      serviceName: 'users-subgraph',
      ecrRepositoryName: usersRepo.repositoryName,
    });
    const billingService = new ApolloBasedService(this, 'BillingService', {
      serviceName: 'billing-subgraph',
      ecrRepositoryName: billingRepo.repositoryName,
    });
    const notificationsService = new ApolloBasedService(this, 'NotificationsService', {
      serviceName: 'notifications-subgraph',
      ecrRepositoryName: notificationsRepo.repositoryName,
    });
    const authorizationService = new FastifyService(this, 'AuthorizationService', {
      serviceName: 'authorization',
      ecrRepositoryName: authorizationRepo.repositoryName,
    });
    const gateway = new GatewayService(this, 'Gateway', {
      ecrRepositoryName: gatewayRepo.repositoryName,
      usersEndpoint: `${usersService.graphQLApiEndpoint}/graphql`,
      billingEndpoint: `${billingService.graphQLApiEndpoint}/graphql`,
      notificationsEndpoint: `${notificationsService.graphQLApiEndpoint}/graphql`,
      authorizationEndpoint: `${authorizationService.apiEndpoint}`,
    });
    new core.CfnOutput(this, 'Users SubGraph', {
      value: `${usersService.graphQLApiEndpoint}/graphql`,
      description: 'The endpoint URL for the users-service GraphQL API',
    });
    new core.CfnOutput(this, 'Notifications SubGraph', {
      value: `${notificationsService.graphQLApiEndpoint}/graphql`,
      description: 'The endpoint URL for the notifications-service GraphQL API',
    });
    new core.CfnOutput(this, 'Billing SubGraph', {
      value: `${billingService.graphQLApiEndpoint}/graphql`,
      description: 'The endpoint URL for the billing-service GraphQL API',
    });
    new core.CfnOutput(this, 'Authorization Output', {
      value: `${authorizationService.apiEndpoint}`,
      description: 'Authorization service used by Gateway',
    });
    new core.CfnOutput(this, 'Gateway Output', {
      value: `${gateway.graphQLApiEndpoint}`,
      description: 'Apollo gateway',
    });

  }
}
