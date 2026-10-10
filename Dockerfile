FROM node:24-alpine

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./prisma.config.ts ./tsconfig.json ./tsconfig.build.json ./nest-cli.json ./

RUN npx prisma generate

EXPOSE 9200

CMD ["npm", "run", "start:dev"]
