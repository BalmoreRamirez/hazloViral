FROM node:22-slim

WORKDIR /app

# Herramientas nativas para bcrypt y sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3009

CMD ["npm", "run", "start:dev"]
