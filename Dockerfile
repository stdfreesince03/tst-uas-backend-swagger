#backend docker file
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000 8080
CMD ["sh", "-c", "node src/server.js & node corsProxy.mjs"]