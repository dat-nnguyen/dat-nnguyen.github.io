FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source code and content
COPY api-gateway ./api-gateway
COPY backend ./backend

ENV PORT=5050
ENV NODE_ENV=production

EXPOSE 5050

CMD ["npm", "start"]
