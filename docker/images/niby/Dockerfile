FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++ \
   && ln -sf python3 /usr/bin/python

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx tsc

# Fresh image to reduce image size
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
