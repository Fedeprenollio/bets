# Usa la imagen de Puppeteer basada en Node.js
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Variables de entorno para saltar la descarga de Chromium y especificar el ejecutable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Eliminar configuraciones duplicadas de repositorios
RUN rm /etc/apt/sources.list.d/google-chrome.list

# Instalar Node.js y NPM
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@10.8.3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD [ "node", "./server/index.js" ]
