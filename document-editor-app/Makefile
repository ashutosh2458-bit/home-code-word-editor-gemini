.PHONY: all wasm dev build clean

all: wasm build

wasm:
	mkdir -p build public/wasm
	emcmake cmake -B build -S .
	cmake --build build --config Release

dev: wasm
	npm install
	npm run dev

build: wasm
	npm install
	npm run build

clean:
	rm -rf build public/wasm dist
