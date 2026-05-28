import { expect, test, describe, beforeEach } from 'vitest';
import { Game, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from '../src/Game.js';

describe('Game.js', () => {
  let game;

  beforeEach(() => {
    game = new Game();
  });

  test('should initialize with correct default values', () => {
    expect(game.level).toBe(1);
    expect(game.score).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.gameOver).toBe(false);
    expect(game.gameWon).toBe(false);
  });

  test('should initialize board grid correctly', () => {
    expect(game.grid.length).toBe(game.gridHeight);
    expect(game.grid[0].length).toBe(game.gridWidth);

    const BORDER = 2;
    // Check border cells
    expect(game.grid[0][0]).toBe(CELL_FILLED);
    expect(game.grid[game.gridHeight - 1][game.gridWidth - 1]).toBe(CELL_FILLED);
    
    // Check inner empty cells
    expect(game.grid[BORDER][BORDER]).toBe(CELL_EMPTY);
    expect(game.grid[Math.floor(game.gridHeight / 2)][Math.floor(game.gridWidth / 2)]).toBe(CELL_EMPTY);
  });

  test('getCell should return correct values and handle out of bounds', () => {
    expect(game.getCell(0, 0)).toBe(CELL_FILLED);
    // Out of bounds should act as FILLED to prevent out of bounds escapes
    expect(game.getCell(-1, -1)).toBe(CELL_FILLED);
    expect(game.getCell(1000, 1000)).toBe(CELL_FILLED);
  });
});
