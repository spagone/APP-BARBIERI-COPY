FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate && npm prune --omit=dev

COPY src ./src

EXPOSE 5000

CMD ["node", "src/index.js"]
