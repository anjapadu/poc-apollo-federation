FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json yarn.lock tsconfig.json watch.js ./
RUN yarn install --immutable
COPY src ./src
RUN yarn build
EXPOSE 4002

CMD ["yarn", "dev"]
