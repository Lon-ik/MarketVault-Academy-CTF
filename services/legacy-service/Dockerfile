FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/conf.d/99-marketvault.ini
COPY html/ /var/www/html/

RUN mkdir -p /var/www/html/uploads /var/www/flags \
    && chown -R www-data:www-data /var/www/html \
    && chmod 777 /var/www/html/uploads

EXPOSE 80