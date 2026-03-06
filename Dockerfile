# Use the official Node.js image with Debian Bookworm (Python 3.11)
FROM node:20-bookworm-slim

# Install necessary tools: Python, FFmpeg, and dependencies for Chromium/Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg python3 python3-pip ffmpeg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up the working directory inside the container
WORKDIR /app

# Tell Puppeteer to skip downloading Chromium since we already installed Google Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Tell Puppeteer where to find Google Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package info and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the correct port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
