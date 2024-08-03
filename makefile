

build:
	bun install
	bun run build

run:
	PORT=8080 bun run ./build/index.js & 
	echo $! >> last.pid

kill:
	if [ -f last.pid ]; then
		pkill $(cat last.pid)
	fi
