FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine
WORKDIR /app/apps/web
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/public ./public
COPY apps/web/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
