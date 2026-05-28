.PHONY: install dev build preview-images clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install         - Install NPM dependencies"
	@echo "  make dev             - Start the local development server"
	@echo "  make build           - Build the game for production"
	@echo "  make preview-images  - Open all game sprites in external viewer (macOS)"
	@echo "  make clean           - Remove node_modules and dist directories"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview-images:
	open public/img/*

clean:
	rm -rf node_modules dist
