## Test production build with Lambda Container

```sh
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
-H "Content-Type: application/json" \
-d '{
  "version": "2.0",
  "routeKey": "POST /graphql",
  "rawPath": "/graphql",
  "rawQueryString": "",
  "headers": {
    "Content-Type": "application/json"
  },
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/graphql",
      "protocol": "HTTP/1.1",
      "sourceIp": "127.0.0.1",
      "userAgent": "curl/7.64.1"
    }
  },
  "body": "{\"query\":\"{ healthCheck }\"}",
  "isBase64Encoded": false
}'
```

## For now to install every package.json (Neew to see if will be multi repo or using something like nx or yarn workspaces)

```sh
yarn install-all
```

## Production Build For Lambda

```sh
docker build --platform linux/amd64 -t users-subgraph:latest . -f Dockerfile.production
docker tag users-subgraph:latest 917720423594.dkr.ecr.us-east-1.amazonaws.com/users-service-repo:latest
docker push 917720423594.dkr.ecr.us-east-1.amazonaws.com/users-service-repo:latest

```

## Script to add package to everyhing and exclude some projects

```sh
node install-packages.js lodash fastify --exclude=cdk
``
```
# poc-apollo-federation
