/**
 * Pure 2048 game logic (4×4 grid). Board is a flat array of 16 numbers; 0 = empty.
 * No React / rendering concerns here so it stays easy to reason about and test.
 */
export const SIZE = 4;
export type Board = number[];
export type Direction = 'up' | 'down' | 'left' | 'right';

export function emptyBoard(): Board {
  return new Array(SIZE * SIZE).fill(0);
}

function emptyCells(board: Board): number[] {
  const cells: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === 0) cells.push(i);
  return cells;
}

/** Places a new tile (2 with 90% chance, else 4) in a random empty cell. */
export function spawnTile(board: Board): Board {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const next = board.slice();
  const idx = cells[Math.floor(Math.random() * cells.length)];
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function newGame(): Board {
  return spawnTile(spawnTile(emptyBoard()));
}

/** Collapse a single row to the left, returning the row + points scored. */
function collapseRow(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter(n => n !== 0);
  const merged: number[] = [];
  let gained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2;
      merged.push(value);
      gained += value;
      i++; // skip the merged neighbour
    } else {
      merged.push(filtered[i]);
    }
  }

  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gained };
}

function getRow(board: Board, r: number): number[] {
  return board.slice(r * SIZE, r * SIZE + SIZE);
}

function setRow(board: Board, r: number, row: number[]): void {
  for (let c = 0; c < SIZE; c++) board[r * SIZE + c] = row[c];
}

function transpose(board: Board): Board {
  const out = emptyBoard();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) out[c * SIZE + r] = board[r * SIZE + c];
  return out;
}

function reverseRows(board: Board): Board {
  const out = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    const row = getRow(board, r).reverse();
    setRow(out, r, row);
  }
  return out;
}

export interface MoveResult {
  board: Board;
  gained: number;
  moved: boolean;
}

/** Applies a move. Returns the new board, points gained, and whether anything moved. */
export function move(board: Board, dir: Direction): MoveResult {
  let working = board.slice();

  // Normalise every direction to a "move left" by transposing / reversing.
  if (dir === 'up') working = transpose(working);
  else if (dir === 'down') working = reverseRows(transpose(working));
  else if (dir === 'right') working = reverseRows(working);

  let gained = 0;
  for (let r = 0; r < SIZE; r++) {
    const { row, gained: g } = collapseRow(getRow(working, r));
    setRow(working, r, row);
    gained += g;
  }

  // Undo the normalisation.
  if (dir === 'up') working = transpose(working);
  else if (dir === 'down') working = transpose(reverseRows(working));
  else if (dir === 'right') working = reverseRows(working);

  const moved = working.some((v, i) => v !== board[i]);
  return { board: working, gained, moved };
}

export function canMove(board: Board): boolean {
  if (emptyCells(board).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r * SIZE + c];
      if (c < SIZE - 1 && v === board[r * SIZE + c + 1]) return true;
      if (r < SIZE - 1 && v === board[(r + 1) * SIZE + c]) return true;
    }
  }
  return false;
}

export function hasReached(board: Board, target: number): boolean {
  return board.some(v => v >= target);
}
