FROM golang:1.22.5 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 7331

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD curl --fail http://localhost:7331/api/health || exit 1

CMD ["./main"]
