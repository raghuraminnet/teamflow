FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm ci --ignore-scripts
COPY tsconfig.json .
COPY src ./src
RUN npm run build
FROM node:22-alpine
WORKDIR /app
COPY --from=0 /app/dist ./dist
COPY package.json .
RUN npm ci --omit=dev --ignore-scripts
RUN mkdir -p /app/recordings
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/index.js"]