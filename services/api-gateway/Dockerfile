FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

USER 1000:1000

EXPOSE 4000

CMD ["node", "src/server.js"]