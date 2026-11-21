FROM golang:1.23-alpine AS build

WORKDIR /src

COPY go.mod main.go ./
RUN go mod tidy \
    && CGO_ENABLED=0 GOOS=linux go build -o /out/inventory .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates \
    && addgroup -g 1000 app \
    && adduser -u 1000 -G app -D app \
    && mkdir -p /srv/inventory/files /var/www/flags

COPY --from=build /out/inventory /usr/local/bin/inventory

RUN printf 'Inventory storage readme.\n' > /srv/inventory/files/readme.txt \
    && chown -R 1000:1000 /srv/inventory

USER 1000:1000

EXPOSE 8080

CMD ["inventory"]