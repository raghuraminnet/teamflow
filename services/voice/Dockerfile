FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install && npm install -g tsx

COPY . .

RUN mkdir -p /app/recordings

EXPOSE 3002

CMD ["tsx", "src/index.ts"]