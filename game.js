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
const BLOCK_FILL = "#dfe5ef";
const BLOCK_EDGE = "#8d98aa";
const BLOCK_INK = "#18202d";
const BLOCK_ACCENT = "#39e6b2";

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
let holdTimer;
let holdInterval;
let touchStart = null;

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

function drawCell(context, x, y, type, size = CELL) {
  const left = x * size;
  const top = y * size;
  const pad = Math.max(1, size * 0.06);
  const inner = size - pad * 2;

  context.fillStyle = BLOCK_FILL;
  context.fillRect(left + pad, top + pad, inner, inner);
  context.strokeStyle = BLOCK_EDGE;
  context.lineWidth = Math.max(1, size * 0.06);
  context.strokeRect(left + pad, top + pad, inner, inner);

  context.fillStyle = "rgba(255, 255, 255, 0.48)";
  context.fillRect(left + pad * 2, top + pad * 2, inner - pad * 2, Math.max(2, size * 0.1));
  drawCellPattern(context, left + pad, top + pad, inner, type);
}

function drawCellPattern(context, left, top, size, type) {
  const centerX = left + size / 2;
  const centerY = top + size / 2;
  const line = Math.max(2, size * 0.09);
  context.lineWidth = line;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = BLOCK_INK;
  context.fillStyle = BLOCK_INK;

  if (type === "I") {
    for (let row = 0.34; row <= 0.68; row += 0.17) {
      context.beginPath();
      context.moveTo(left + size * 0.23, top + size * row);
      context.lineTo(left + size * 0.77, top + size * row);
      context.stroke();
    }
    return;
  }

  if (type === "J") {
    context.strokeRect(left + size * 0.28, top + size * 0.28, size * 0.44, size * 0.44);
    context.fillStyle = BLOCK_ACCENT;
    context.beginPath();
    context.arc(left + size * 0.31, top + size * 0.69, size * 0.09, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (type === "L") {
    context.beginPath();
    context.moveTo(left + size * 0.28, top + size * 0.72);
    context.lineTo(left + size * 0.72, top + size * 0.28);
    context.stroke();
    context.beginPath();
    context.moveTo(left + size * 0.55, top + size * 0.72);
    context.lineTo(left + size * 0.74, top + size * 0.72);
    context.lineTo(left + size * 0.74, top + size * 0.53);
    context.stroke();
    return;
  }

  if (type === "O") {
    context.strokeStyle = BLOCK_ACCENT;
    context.beginPath();
    context.arc(centerX, centerY, size * 0.22, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = BLOCK_INK;
    context.beginPath();
    context.arc(centerX, centerY, size * 0.08, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (type === "S") {
    context.beginPath();
    context.moveTo(left + size * 0.22, centerY);
    context.bezierCurveTo(left + size * 0.36, top + size * 0.25, left + size * 0.64, top + size * 0.75, left + size * 0.78, centerY);
    context.stroke();
    return;
  }

  if (type === "T") {
    context.beginPath();
    context.moveTo(centerX, top + size * 0.23);
    context.lineTo(left + size * 0.72, top + size * 0.7);
    context.lineTo(left + size * 0.28, top + size * 0.7);
    context.closePath();
    context.stroke();
    return;
  }

  if (type === "Z") {
    context.strokeStyle = BLOCK_ACCENT;
    context.beginPath();
    context.moveTo(left + size * 0.24, top + size * 0.32);
    context.lineTo(left + size * 0.62, top + size * 0.32);
    context.lineTo(left + size * 0.38, top + size * 0.68);
    context.lineTo(left + size * 0.76, top + size * 0.68);
    context.stroke();
  }
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
        drawCell(context, x + activePiece.x + offsetX, y + activePiece.y + offsetY, activePiece.type, size);
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
        drawCell(boardContext, x, y, type);
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

function runAction(action) {
  if (action === "left") move(-1);
  if (action === "right") move(1);
  if (action === "rotate") rotatePiece();
  if (action === "down") softDrop();
  if (action === "drop") hardDrop();
}

function clearHold() {
  clearTimeout(holdTimer);
  clearInterval(holdInterval);
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pressButton(button);
    const action = button.dataset.action;
    runAction(action);

    if (["left", "right", "down"].includes(action)) {
      clearHold();
      holdTimer = setTimeout(() => {
        holdInterval = setInterval(() => runAction(action), action === "down" ? 65 : 90);
      }, 180);
    }
  });

  button.addEventListener("pointerup", clearHold);
  button.addEventListener("pointercancel", clearHold);
  button.addEventListener("pointerleave", clearHold);
});

boardCanvas.addEventListener("pointerdown", (event) => {
  touchStart = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now()
  };
});

boardCanvas.addEventListener("pointerup", (event) => {
  if (!touchStart || !canControl()) {
    touchStart = null;
    return;
  }

  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const swipe = Math.max(absX, absY) > 26;

  if (swipe && absX > absY) {
    move(dx > 0 ? 1 : -1);
  } else if (swipe && dy > 0) {
    softDrop();
  } else if (!swipe) {
    rotatePiece();
  }

  touchStart = null;
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
