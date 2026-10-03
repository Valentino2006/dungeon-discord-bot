FROM node:20-slim

# Instalar herramientas para librerías nativas (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar paquetes e instalar dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar el código del bot
COPY . .

CMD ["node", "bot.js"]