# syntax=docker/dockerfile:1

FROM node:lts-alpine AS build
WORKDIR /bookcars/admin

# 1) Copy only dependency files first (cached layer)
COPY ./packages/bookcars-types/package.json /bookcars/packages/bookcars-types/package.json
COPY ./packages/bookcars-helper/package.json /bookcars/packages/bookcars-helper/package.json
COPY ./packages/currency-converter/package.json /bookcars/packages/currency-converter/package.json
COPY ./packages/disable-react-devtools/package.json /bookcars/packages/disable-react-devtools/package.json
COPY ./packages/reactjs-social-login/package.json /bookcars/packages/reactjs-social-login/package.json
COPY ./admin/package.json ./admin/package-lock.json ./

RUN npm install --force

# 2) Copy source code + build (only this layer rebuilds on code changes)
COPY ./packages /bookcars/packages
COPY ./admin ./
COPY ./admin/.env.docker .env
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/admin/build .
COPY ./admin/nginx.conf /etc/nginx/conf.d/default.conf
RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001
