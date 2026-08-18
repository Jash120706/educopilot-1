FROM node:22

WORKDIR /app

# Server package files
COPY server/package*.json ./server/

# Install production dependencies
RUN cd server && npm install --omit=dev

# Copy server
COPY server ./server

# Copy React production build
COPY client/dist ./client/dist

# Start from server directory
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
