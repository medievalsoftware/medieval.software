.PHONY: build run

build:
	bun install
	bun run build

run:
	PORT=8080 \
	HOST_HEADER=X-Forwarded-Host \
	bun run ./build/index.js
