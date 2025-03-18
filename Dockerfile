FROM node:20-alpine


RUN NODE_OPTIONS="--max-old-space-size=8192"
RUN apk add --no-cache openssl

COPY package*.json ./package.json
RUN npm install

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./tsconfig.json ./tsconfig.json

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

