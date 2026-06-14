FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 python3-pip python3-venv make g++ git \
  && apt-get clean && rm -rf /var/lib/apt/lists/* \
  && python3 -m pip install --break-system-packages invoke

WORKDIR /app

COPY package.json ./

# Let npm run its own postinstall (builds mediasoup worker)
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3004
CMD ["node", "dist/index.js"]