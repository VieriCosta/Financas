FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace @financas/backend

FROM deps AS build
COPY backend backend
RUN npm run prisma:generate -w backend && npm run build -w backend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/prisma backend/prisma
CMD ["npm", "run", "start", "-w", "backend"]
