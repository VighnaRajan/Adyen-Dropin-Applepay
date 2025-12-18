FROM node:18-alpine

WORKDIR /app

# Copy package.json first for cached install
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy app
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
