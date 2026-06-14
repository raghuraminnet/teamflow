FROM node:22-alpine

WORKDIR /app

# mediasoup needs Python + make + g++ for native compilation
RUN apk add --no-cache \
  python3 make g++ git \
  linux-headers musl-dev

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

# Build native mediasoup
RUN npm rebuild mediasoup

COPY . .
RUN npm run build || true

CMD ["node", "dist/index.js"]