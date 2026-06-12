# ============================================================
# Stage 1: Build the React app
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Serve with nginx
# ============================================================
FROM nginx:alpine

# Copy built assets into nginx document root
COPY --from=build /app/dist /usr/share/nginx/html

# Create recordings directory for voice call files
RUN mkdir -p /usr/share/nginx/html/recordings

# Custom startup script waits for gateway before starting nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]