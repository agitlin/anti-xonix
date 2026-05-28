# Anti-Xonix

A classic arcade-style game built with Three.js and Vite. Guide the Anti-Xonix hero to capture territory while dodging bouncing enemies and capturing powerups!

## 🤖 AI Developer Guidelines

> **CRITICAL RULE FOR AI AGENTS:** This project follows strict Test-Driven Development. Whenever you add a new feature, modify core logic (e.g., `Game.js`, `Enemy.js`, `Player.js`), or fix a bug, you **MUST** write or update the corresponding tests in the `tests/` directory before completing your task. Ensure all tests pass using `make test`.

## 🚀 Getting Started

This project is built using [Vite](https://vitejs.dev/) as the build tool.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm`

### Installation

1. Clone the repository and navigate to the root directory.
2. Install the dependencies:
   ```bash
   make install
   ```

### Development

To start the local development server with Hot Module Replacement (HMR):
```bash
make dev
```
The game will be available at `http://localhost:5173/`.

### Building for Production

To build the static files for production (e.g., GitHub Pages):
```bash
make build
```
This will bundle the game into the `dist/` directory. The project's `.github/workflows/deploy.yml` automatically takes care of deploying the `main` branch to GitHub pages.

## 🛠 Developer Scripts

A `Makefile` is provided for convenience. Run `make` or `make help` to see all options:

- `make install`: Install NPM dependencies.
- `make dev`: Start the local dev server.
- `make build`: Build the game for production.
- `make preview-images`: Opens all the game sprites (in `public/img/`) using the macOS `open` command for quick review.
- `make clean`: Removes `node_modules` and `dist` directories.

## 📁 Project Structure

- `src/` - Contains all the source code for the game logic.
  - `main.js` - Game loop and THREE.js scene setup.
  - `Game.js` - Core game state and board logic.
  - `Player.js` - Player movement and capturing mechanics.
  - `Enemy.js` - Various enemy types and AI.
  - `style.css` - Game overlay UI styling.
- `public/img/` - Static image assets and sprites.
- `tests/` - Directory reserved for future tests.
- `index.html` - The main entry point for the game.
- `vite.config.js` - Vite configuration for routing and building.
