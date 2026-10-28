FROM node:22-slim

WORKDIR /app

# Herramientas nativas y ps para que Nest cierre su proceso anterior al recompilar.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ procps \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3009

CMD ["npm", "run", "start:dev"]
