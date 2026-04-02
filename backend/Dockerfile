# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/backend

# 1) Copy only dependency files first (cached layer)
COPY ./packages/bookcars-types/package.json /bookcars/packages/bookcars-types/package.json
COPY ./packages/bookcars-helper/package.json /bookcars/packages/bookcars-helper/package.json
COPY ./packages/currency-converter/package.json /bookcars/packages/currency-converter/package.json
COPY ./backend/package.json ./backend/package-lock.json ./

RUN npm install

# 2) Copy source code (only this layer rebuilds on code changes)
COPY ./packages /bookcars/packages
COPY ./backend ./
COPY ./backend/.env.docker .env

CMD [ "npm", "run", "start:setup"]
EXPOSE 4002
