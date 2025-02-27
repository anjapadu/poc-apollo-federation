#!/bin/bash

SUBGRAPH_NAME=$1

if [ -z "$SUBGRAPH_NAME" ]; then
  echo "Usage: ./create-subgraph.sh <subgraph-name>"
  exit 1
fi

# Clone the boilerplate
cp -r templates/subgraph subgraphs/$SUBGRAPH_NAME

# Update package.json name
sed -i '' "s/\"name\": \"subgraph-boilerplate\"/\"name\": \"$SUBGRAPH_NAME\"/" subgraphs/$SUBGRAPH_NAME/package.json

# Initialize Yarn
cd subgraphs/$SUBGRAPH_NAME
touch src/schema/$SUBGRAPH_NAME.graphql
yarn install

echo "Subgraph $SUBGRAPH_NAME created successfully!"
