# Use the official Node.js image with Debian Bookworm (Python 3.11)
FROM node:20-bookworm-slim

# Install necessary tools: Python, FFmpeg
RUN apt-get update \
    && apt-get install -y wget gnupg python3 python3-pip ffmpeg \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up the working directory inside the container
WORKDIR /app

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
