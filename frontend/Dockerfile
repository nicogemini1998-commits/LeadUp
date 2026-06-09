## ── dev: vite dev server with hot-reload ──────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

## ── build ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

## ── prod: nginx serving the build ─────────────────────────
FROM nginx:alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
