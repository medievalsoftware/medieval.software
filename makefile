
default:
	bun install
	bun run build
	PORT=8080 bun run ./build/index.js
