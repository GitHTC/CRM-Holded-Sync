FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:server && npm prune --omit=dev
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
