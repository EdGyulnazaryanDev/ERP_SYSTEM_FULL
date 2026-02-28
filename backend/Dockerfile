FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./

RUN npm install   # БЕЗ --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]