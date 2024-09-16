FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Instalar Google Chrome
USER root
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  curl \
  libnss3 \
  libgdk-pixbuf2.0-0 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  libgbm1 \
  libasound2 \
  libxshmfence1 \
  libpci3 \
  && rm -rf /var/lib/apt/lists/* \
  && curl -sS https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o google-chrome-stable_current_amd64.deb \
  && apt-get install -y ./google-chrome-stable_current_amd64.deb \
  && rm google-chrome-stable_current_amd64.deb

# Configurar variables de entorno
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Configurar el directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos de configuración y de la aplicación
COPY package*.json ./
RUN npm ci
COPY . .

# Comando para iniciar la aplicación
CMD [ "node", "./server/index.js" ]
