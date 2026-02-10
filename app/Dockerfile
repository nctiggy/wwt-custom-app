FROM nginx:alpine

ARG APP_VERSION=v1

COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY app/${APP_VERSION}/index.html /usr/share/nginx/html/index.html
COPY css/style.css /usr/share/nginx/html/css/style.css

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1
