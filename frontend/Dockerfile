FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace @financas/frontend

FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY frontend frontend
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
