.PHONY: install dev build preview-images clean test test-watch coverage

# Default target
help:
	@echo "Available commands:"
	@echo "  make install         - Install NPM dependencies"
	@echo "  make dev             - Start the local development server"
	@echo "  make build           - Build the game for production"
	@echo "  make test            - Run the Vitest test suite once"
	@echo "  make test-watch      - Run tests in watch mode for development"
	@echo "  make coverage        - Run tests and generate coverage report"
	@echo "  make preview-images  - Open all game sprites in external viewer (macOS)"
	@echo "  make clean           - Remove node_modules and dist directories"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

test-watch:
	npm run test:watch

coverage:
	npm run coverage

preview-images:
	open public/img/*

clean:
	rm -rf node_modules dist
