FROM node:22-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

EXPOSE 4005

# Optional at runtime: set PORT via env
CMD ["npm", "run", "start"]

