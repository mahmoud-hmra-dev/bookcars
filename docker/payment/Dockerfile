FROM php:8.2-fpm-bullseye

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    default-mysql-client \
    libzip-dev \
    zip \
    unzip \
    git \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY . .

RUN cp .env.example .env || true

ENV APP_URL=https://clindr-payment.hdf.usj.edu.lb

RUN composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache

RUN printf 'server {\n    listen 8000;\n    server_name _;\n    root /var/www/html/public;\n\n    index index.php index.html;\n\n    access_log /dev/stdout;\n    error_log /dev/stderr;\n\n    location / {\n        try_files $uri $uri/ /index.php?$query_string;\n    }\n\n    location ~ \\.php$ {\n        include snippets/fastcgi-php.conf;\n        fastcgi_pass 127.0.0.1:9000;\n        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n    }\n\n    location ~ /\\.ht {\n        deny all;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

RUN printf '[supervisord]\nnodaemon=true\n\n[program:php-fpm]\ncommand=/usr/local/sbin/php-fpm -F\npriority=5\n\n[program:nginx]\ncommand=/usr/sbin/nginx -g \"daemon off;\"\npriority=10\n' > /etc/supervisor/conf.d/supervisord.conf

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENV APP_ENV=production \
    APP_DEBUG=false

ENTRYPOINT ["/entrypoint.sh"]
