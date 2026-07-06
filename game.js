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
const BOARD_W = boardCanvas.width;
const BOARD_H = boardCanvas.height;

const BLOCK_FILL = "#dfe5ef";
const BLOCK_EDGE = "#8d98aa";
const BLOCK_INK = "#172033";
const BLOCK_ACCENT = "#53f3c3";
const ACTIVE_EDGE = "#ff6b6b";

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
let activePiece;
let nextPiece;
let player;
let score;
let level;
let lines;
let dropCounter;
let lastTime;
let running;
let paused;
let gameOver;
let bag = [];
const keys = { left: false, right: false };

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

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function randomizeMatrix(matrix, type) {
  if (type === "O") {
    return matrix;
  }

  let next = matrix;
  const turns = Math.floor(Math.random() * 4);
  for (let index = 0; index < turns; index += 1) {
    next = rotateMatrix(next);
  }
  return next;
}

function createPiece() {
  if (bag.length === 0) {
    refillBag();
  }

  const type = bag.pop();
  const matrix = randomizeMatrix(SHAPES[type].map((row) => [...row]), type);
  const maxX = COLS - matrix[0].length;

  return {
    type,
    matrix,
    x: Math.floor(Math.random() * (maxX + 1)),
    y: -matrix.length
  };
}

function createPlayer() {
  return {
    x: BOARD_W / 2 - CELL * 0.34,
    y: BOARD_H - CELL * 1.25,
    w: CELL * 0.68,
    h: CELL * 1.15,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1
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
  keys.left = false;
  keys.right = false;
  player = createPlayer();
  activePiece = createPiece();
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

  const delta = Math.min(34, time - lastTime || 16);
  lastTime = time;
  dropCounter += delta;
  score += delta * 0.012;
  level = Math.floor(score / 650) + 1;

  updatePlayer(delta);
  if (activeTouchesPlayer()) {
    endGame("Krentanti figūra palietė žmogutį.");
    return;
  }

  if (dropCounter > dropInterval()) {
    stepPieceDown();
  }

  updateHud();
  draw();
  requestAnimationFrame(update);
}

function dropInterval() {
  return Math.max(180, 760 - (level - 1) * 52);
}

function pieceCollides(piece, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) {
        continue;
      }

      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;

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

function stepPieceDown() {
  if (pieceCollides(activePiece, 0, 1)) {
    mergePiece();
    clearLines();
    activePiece = nextPiece;
    nextPiece = createPiece();

    if (pieceCollides(activePiece)) {
      endGame("Lenta užsipildė.");
      return;
    }
  } else {
    activePiece.y += 1;
  }
  dropCounter = 0;
}

function mergePiece() {
  activePiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      const boardX = activePiece.x + x;
      const boardY = activePiece.y + y;
      if (value && boardY >= 0 && boardY < ROWS) {
        grid[boardY][boardX] = activePiece.type;
      }
    });
  });
}

function clearLines() {
  const playerTopRow = Math.floor(player.y / CELL);
  let cleared = 0;
  let clearedBelowPlayer = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (grid[y].every(Boolean)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared += 1;
      if (y > playerTopRow) {
        clearedBelowPlayer += 1;
      }
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 120, 340, 620, 980][cleared] || cleared * 260;
    player.y = Math.min(BOARD_H - player.h, player.y + clearedBelowPlayer * CELL);
  }
}

function updatePlayer(delta) {
  const seconds = delta / 1000;
  const speed = 178;
  const gravity = 1250;
  const friction = player.grounded ? 0.72 : 0.93;
  const input = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  if (input !== 0) {
    player.vx = input * speed;
    player.facing = input;
  } else {
    player.vx *= friction;
    if (Math.abs(player.vx) < 3) {
      player.vx = 0;
    }
  }

  player.vy += gravity * seconds;
  player.grounded = false;

  movePlayerAxis(player.vx * seconds, 0);
  movePlayerAxis(0, player.vy * seconds);
}

function movePlayerAxis(dx, dy) {
  if (dx !== 0) {
    player.x += dx;
    player.x = Math.max(0, Math.min(BOARD_W - player.w, player.x));

    for (const block of solidBlocks()) {
      if (!rectsOverlap(player, block)) {
        continue;
      }
      if (dx > 0) {
        player.x = block.x - player.w;
      } else {
        player.x = block.x + block.w;
      }
      player.vx = 0;
    }
  }

  if (dy !== 0) {
    const previousBottom = player.y + player.h;
    const previousTop = player.y;
    player.y += dy;

    if (player.y + player.h >= BOARD_H) {
      player.y = BOARD_H - player.h;
      player.vy = 0;
      player.grounded = true;
      return;
    }

    for (const block of solidBlocks()) {
      if (!rectsOverlap(player, block)) {
        continue;
      }

      if (dy > 0 && previousBottom <= block.y + 3) {
        player.y = block.y - player.h;
        player.vy = 0;
        player.grounded = true;
      } else if (dy < 0 && previousTop >= block.y + block.h - 3) {
        player.y = block.y + block.h;
        player.vy = 0;
      }
    }
  }
}

function solidBlocks() {
  const blocks = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (grid[y][x]) {
        blocks.push({ x: x * CELL, y: y * CELL, w: CELL, h: CELL });
      }
    }
  }
  return blocks;
}

function jump() {
  if (!canControl() || !player.grounded) {
    return;
  }
  player.vy = -520;
  player.grounded = false;
}

function activeTouchesPlayer() {
  for (const block of activeBlocks()) {
    if (rectsOverlap(player, block)) {
      return true;
    }
  }
  return false;
}

function activeBlocks() {
  const blocks = [];
  activePiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      const boardY = activePiece.y + y;
      if (value && boardY >= 0) {
        blocks.push({
          x: (activePiece.x + x) * CELL,
          y: boardY * CELL,
          w: CELL,
          h: CELL,
          type: activePiece.type
        });
      }
    });
  });
  return blocks;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

function endGame(reason) {
  running = false;
  gameOver = true;
  keys.left = false;
  keys.right = false;
  showOverlay(`${reason} Surinkai ${Math.floor(score)} taškų.`, "Žaisti vėl");
}

function canControl() {
  return running && !paused && !gameOver;
}

function updateHud() {
  scoreElement.textContent = Math.floor(score);
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

function drawCell(context, x, y, type, size = CELL, active = false) {
  const left = x * size;
  const top = y * size;
  const pad = Math.max(1, size * 0.06);
  const inner = size - pad * 2;

  context.fillStyle = active ? "#f6e7e7" : BLOCK_FILL;
  context.fillRect(left + pad, top + pad, inner, inner);
  context.strokeStyle = active ? ACTIVE_EDGE : BLOCK_EDGE;
  context.lineWidth = Math.max(1, size * 0.06);
  context.strokeRect(left + pad, top + pad, inner, inner);

  context.fillStyle = active ? "rgba(255, 107, 107, 0.24)" : "rgba(255, 255, 255, 0.48)";
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

function drawBoard() {
  const sky = boardContext.createLinearGradient(0, 0, 0, BOARD_H);
  sky.addColorStop(0, "#0b1a2e");
  sky.addColorStop(0.58, "#07101c");
  sky.addColorStop(1, "#050a12");
  boardContext.fillStyle = sky;
  boardContext.fillRect(0, 0, BOARD_W, BOARD_H);

  boardContext.strokeStyle = "rgba(255, 255, 255, 0.045)";
  boardContext.lineWidth = 1;
  for (let x = 1; x < COLS; x += 1) {
    boardContext.beginPath();
    boardContext.moveTo(x * CELL, 0);
    boardContext.lineTo(x * CELL, BOARD_H);
    boardContext.stroke();
  }
  for (let y = 1; y < ROWS; y += 1) {
    boardContext.beginPath();
    boardContext.moveTo(0, y * CELL);
    boardContext.lineTo(BOARD_W, y * CELL);
    boardContext.stroke();
  }

  boardContext.fillStyle = "rgba(83, 243, 195, 0.08)";
  boardContext.fillRect(0, BOARD_H - 8, BOARD_W, 8);
}

function drawPiece(context, piece, size = CELL, offsetX = 0, offsetY = 0, active = false) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const drawY = y + piece.y + offsetY;
        if (drawY >= 0) {
          drawCell(context, x + piece.x + offsetX, drawY, piece.type, size, active);
        }
      }
    });
  });
}

function drawNext() {
  const size = 24;
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextContext.fillStyle = "#07101c";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const width = nextPiece.matrix[0].length;
  const height = nextPiece.matrix.length;
  const preview = {
    ...nextPiece,
    x: Math.floor((5 - width) / 2),
    y: Math.floor((5 - height) / 2)
  };
  drawPiece(nextContext, preview, size, 0, 0, true);
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const w = player.w;
  const h = player.h;
  const cx = x + w / 2;

  boardContext.save();
  boardContext.translate(cx, y);
  boardContext.scale(player.facing, 1);
  boardContext.translate(-cx, -y);

  boardContext.fillStyle = "#ffd166";
  boardContext.beginPath();
  boardContext.arc(cx, y + h * 0.22, w * 0.32, 0, Math.PI * 2);
  boardContext.fill();

  boardContext.fillStyle = "#53f3c3";
  boardContext.fillRect(cx - w * 0.32, y + h * 0.43, w * 0.64, h * 0.34);

  boardContext.strokeStyle = "#0b1220";
  boardContext.lineWidth = 3;
  boardContext.beginPath();
  boardContext.moveTo(cx - w * 0.18, y + h * 0.77);
  boardContext.lineTo(cx - w * 0.32, y + h);
  boardContext.moveTo(cx + w * 0.18, y + h * 0.77);
  boardContext.lineTo(cx + w * 0.34, y + h);
  boardContext.moveTo(cx + w * 0.25, y + h * 0.5);
  boardContext.lineTo(cx + w * 0.48, y + h * 0.42);
  boardContext.stroke();

  boardContext.fillStyle = "#0b1220";
  boardContext.beginPath();
  boardContext.arc(cx + w * 0.12, y + h * 0.2, 2.3, 0, Math.PI * 2);
  boardContext.fill();
  boardContext.restore();
}

function draw() {
  drawBoard();

  grid.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) {
        drawCell(boardContext, x, y, type);
      }
    });
  });

  drawPiece(boardContext, activePiece, CELL, 0, 0, true);
  drawPlayer();
  drawNext();
}

function setAction(action, pressed) {
  if (action === "left") {
    keys.left = pressed;
  }
  if (action === "right") {
    keys.right = pressed;
  }
  if (action === "jump" && pressed) {
    jump();
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
    setAction(button.dataset.action, true);
  });

  button.addEventListener("pointerup", () => setAction(button.dataset.action, false));
  button.addEventListener("pointercancel", () => setAction(button.dataset.action, false));
  button.addEventListener("pointerleave", () => setAction(button.dataset.action, false));
});

boardCanvas.addEventListener("pointerdown", (event) => {
  const rect = boardCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const third = rect.width / 3;

  if (x < third) {
    keys.left = true;
  } else if (x > third * 2) {
    keys.right = true;
  } else {
    jump();
  }
});

boardCanvas.addEventListener("pointerup", () => {
  keys.left = false;
  keys.right = false;
});
boardCanvas.addEventListener("pointercancel", () => {
  keys.left = false;
  keys.right = false;
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
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keys.left = true;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keys.right = true;
  if (event.key === "ArrowUp" || event.code === "Space" || event.key.toLowerCase() === "w") {
    event.preventDefault();
    jump();
  }
  if (event.key.toLowerCase() === "p") togglePause();
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keys.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keys.right = false;
});

grid = createGrid();
player = createPlayer();
activePiece = createPiece();
nextPiece = createPiece();
score = 0;
level = 1;
lines = 0;
running = false;
paused = false;
gameOver = false;
updateHud();
draw();
