FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
COPY app/client/package*.json app/client/
COPY app/server/package*.json app/server/
WORKDIR /app/app/client
RUN npm ci --include=optional
RUN npm install --no-save @rolldown/binding-linux-x64-gnu@1.0.0 lightningcss-linux-x64-gnu@1.32.0

WORKDIR /app
COPY app/client app/client
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace app/client

FROM nginx:1.31-alpine AS runtime

COPY app/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/app/client/dist /usr/share/nginx/html

EXPOSE 80
