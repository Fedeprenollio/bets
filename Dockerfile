# Usa la imagen de Puppeteer basada en Node.js
FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Variables de entorno para saltar la descarga de Chromium y especificar el ejecutable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Instalar la versión correcta de Node.js y NPM
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@10.8.3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Comando por defecto
CMD [ "node", "index.js" ]
