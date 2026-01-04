# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/backend
COPY ./backend ./
COPY ./backend/.env.docker .env
COPY ./packages /bookcars/packages
RUN npm ci --no-audit --no-fund

CMD [ "npm", "run", "start:setup"]
EXPOSE 4002
