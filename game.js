const boardCanvas = document.querySelector("#board");
const nextCanvas = document.querySelector("#next");
const boardContext = boardCanvas.getContext("2d");
const nextContext = nextCanvas.getContext("2d");

const scoreElement = document.querySelector("#score");
const levelElement = document.querySelector("#level");
const linesElement = document.querySelector("#lines");
const overlay = document.querySelector("#overlay");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");

const COLS = 10;
const ROWS = 20;
const CELL = boardCanvas.width / COLS;
const COLORS = {
  I: "#5ce1e6",
  J: "#6c8cff",
  L: "#ffb84d",
  O: "#ffe066",
  S: "#69db7c",
  T: "#c77dff",
  Z: "#ff6b6b"
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

let grid;
let piece;
let nextPiece;
let score;
let level;
let lines;
let dropCounter;
let lastTime;
let running;
let paused;
let gameOver;
let bag = [];

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function refillBag() {
  bag = Object.keys(SHAPES);
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
}

function createPiece() {
  if (bag.length === 0) {
    refillBag();
  }

  const type = bag.pop();
  const matrix = SHAPES[type].map((row) => [...row]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0
  };
}

function resetGame() {
  grid = createGrid();
  score = 0;
  level = 1;
  lines = 0;
  dropCounter = 0;
  lastTime = 0;
  running = true;
  paused = false;
  gameOver = false;
  bag = [];
  piece = createPiece();
  nextPiece = createPiece();
  updateHud();
  hideOverlay();
  draw();
  requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running || paused || gameOver) {
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval()) {
    softDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function dropInterval() {
  return Math.max(95, 760 - (level - 1) * 65);
}

function collides(candidate = piece, offsetX = 0, offsetY = 0, matrix = candidate.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }

      const boardX = candidate.x + x + offsetX;
      const boardY = candidate.y + y + offsetY;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        return true;
      }
      if (boardY >= 0 && grid[boardY][boardX]) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.y + y >= 0) {
        grid[piece.y + y][piece.x + x] = piece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (grid[y].every(Boolean)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800][cleared] * level;
    score += points;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    updateHud();
  }
}

function spawnPiece() {
  piece = nextPiece;
  nextPiece = createPiece();
  if (collides(piece)) {
    endGame();
  }
}

function softDrop() {
  if (collides(piece, 0, 1)) {
    mergePiece();
    clearLines();
    spawnPiece();
  } else {
    piece.y += 1;
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!canControl()) {
    return;
  }
  while (!collides(piece, 0, 1)) {
    piece.y += 1;
    score += 2;
  }
  softDrop();
  updateHud();
  draw();
}

function move(direction) {
  if (!canControl()) {
    return;
  }
  if (!collides(piece, direction, 0)) {
    piece.x += direction;
    draw();
  }
}

function rotatePiece() {
  if (!canControl() || piece.type === "O") {
    return;
  }

  const rotated = piece.matrix[0].map((_, index) => piece.matrix.map((row) => row[index]).reverse());
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(piece, kick, 0, rotated)) {
      piece.matrix = rotated;
      piece.x += kick;
      draw();
      return;
    }
  }
}

function togglePause() {
  if (!running || gameOver) {
    return;
  }
  paused = !paused;
  pauseButton.textContent = paused ? "Tęsti" : "Pauzė";
  if (paused) {
    showOverlay("Žaidimas sustabdytas.", "Tęsti");
  } else {
    hideOverlay();
    lastTime = performance.now();
    requestAnimationFrame(update);
  }
}

function endGame() {
  running = false;
  gameOver = true;
  showOverlay(`Pabaiga. Surinkai ${score} taškų.`, "Žaisti vėl");
}

function canControl() {
  return running && !paused && !gameOver;
}

function updateHud() {
  scoreElement.textContent = score;
  levelElement.textContent = level;
  linesElement.textContent = lines;
}

function showOverlay(text, buttonText) {
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
  pauseButton.textContent = "Pauzė";
}

function drawCell(context, x, y, color, size = CELL) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = "rgba(255, 255, 255, 0.18)";
  context.fillRect(x * size + 3, y * size + 3, size - 6, Math.max(2, size * 0.12));
}

function drawBoardGrid() {
  boardContext.fillStyle = "#080a0f";
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  boardContext.strokeStyle = "rgba(255, 255, 255, 0.045)";
  boardContext.lineWidth = 1;

  for (let x = 1; x < COLS; x += 1) {
    boardContext.beginPath();
    boardContext.moveTo(x * CELL, 0);
    boardContext.lineTo(x * CELL, boardCanvas.height);
    boardContext.stroke();
  }

  for (let y = 1; y < ROWS; y += 1) {
    boardContext.beginPath();
    boardContext.moveTo(0, y * CELL);
    boardContext.lineTo(boardCanvas.width, y * CELL);
    boardContext.stroke();
  }
}

function drawPiece(context, activePiece, size = CELL, offsetX = 0, offsetY = 0) {
  activePiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(context, x + activePiece.x + offsetX, y + activePiece.y + offsetY, COLORS[activePiece.type], size);
      }
    });
  });
}

function drawGhost() {
  const ghost = {
    ...piece,
    matrix: piece.matrix
  };
  while (!collides(ghost, 0, 1)) {
    ghost.y += 1;
  }
  boardContext.globalAlpha = 0.25;
  drawPiece(boardContext, ghost);
  boardContext.globalAlpha = 1;
}

function drawNext() {
  const size = 24;
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextContext.fillStyle = "#0b0e14";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const width = nextPiece.matrix[0].length;
  const height = nextPiece.matrix.length;
  const preview = {
    ...nextPiece,
    x: Math.floor((5 - width) / 2),
    y: Math.floor((5 - height) / 2)
  };
  drawPiece(nextContext, preview, size);
}

function draw() {
  drawBoardGrid();
  grid.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) {
        drawCell(boardContext, x, y, COLORS[type]);
      }
    });
  });

  if (piece && !gameOver) {
    drawGhost();
    drawPiece(boardContext, piece);
  }

  if (nextPiece) {
    drawNext();
  }
}

function pressButton(button) {
  button.classList.add("is-pressed");
  setTimeout(() => button.classList.remove("is-pressed"), 90);
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pressButton(button);
    const action = button.dataset.action;
    if (action === "left") move(-1);
    if (action === "right") move(1);
    if (action === "rotate") rotatePiece();
    if (action === "down") softDrop();
    if (action === "drop") hardDrop();
  });
});

startButton.addEventListener("click", () => {
  if (paused) {
    togglePause();
    return;
  }
  resetGame();
});

pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.key === "ArrowUp") rotatePiece();
  if (event.key === "ArrowDown") softDrop();
  if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  }
  if (event.key.toLowerCase() === "p") togglePause();
});

grid = createGrid();
piece = createPiece();
nextPiece = createPiece();
score = 0;
level = 1;
lines = 0;
running = false;
paused = false;
gameOver = false;
updateHud();
draw();
