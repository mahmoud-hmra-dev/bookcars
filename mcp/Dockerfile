# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

RUN addgroup --system app && adduser --system --ingroup app app
RUN chown -R app:app /app
USER app

CMD ["node", "dist/index.js"]
EXPOSE 3100
