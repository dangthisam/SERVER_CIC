
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=8000
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY data/ ./data/
EXPOSE 8000
USER node
CMD ["node", "server.js"]