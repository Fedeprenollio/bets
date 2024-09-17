FROM ghcr.io/puppeteer/puppeteer:19.7.2

# Usuario root para poder instalar dependencias del sistema
USER root

# Install system dependencies and Google Chrome stable
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
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    # Add Google's GPG key and repository
    curl -sS https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    # Install Google Chrome
    curl -sS https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/google-chrome-stable.deb && \
    apt-get install -y /tmp/google-chrome-stable.deb && \
    rm /tmp/google-chrome-stable.deb && \
    rm -rf /var/lib/apt/lists/*


# Establecer variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Establecer directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos de la aplicación
COPY package*.json ./
RUN npm ci

COPY . .

# Exponer el puerto si es necesario (puedes ajustar este número si es otro)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "./server/index.js"]
