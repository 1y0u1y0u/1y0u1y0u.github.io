let board = Array(9).fill(null); // 棋盤狀態
let current = 'X'; // 當前玩家（玩家為X）
let active = true; // 控制遊戲是否進行中
let winLine = null; // 用來畫勝利線

function init() {
 const boardEl = document.getElementById('board');
 boardEl.innerHTML = '';
 board = Array(9).fill(null);
 active = true;
 current = 'X';
 document.getElementById('status').innerText = '玩家 (X) 先手';
 // 建立9個格子
for (let i = 0; i < 9; i++) {
 const cell = document.createElement('div');
 cell.classList.add('cell');
 cell.onclick = () => playerMove(i);
 boardEl.appendChild(cell);
}
}

// 玩家下棋
function playerMove(i) {
    if (!active || board[i]) return;

    board[i] = 'X';
    animateMove(i, 'X');
    updateBoard();

    if (checkWin('X')) {
        drawWinLine(winLine);
        endGame('玩家 (X) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }

    current = 'O';
    document.getElementById('status').innerText = '電腦思考中...';

    setTimeout(computerMove, 500);
}

// 電腦AI下棋邏輯
function computerMove() {
    // 1. 嘗試自己獲勝
    let move = findWinningMove('O');
    // 2. 嘗試阻止玩家獲勝
    if (move === null) move = findWinningMove('X');
    // 3. 否則隨機下在空格
    if (move === null) move = getRandomMove();
    board[move] = 'O';
    updateBoard();
    if (checkWin('O')) {
        endGame('電腦 (O) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }
    current = 'X';
    document.getElementById('status').innerText = '輪到玩家 (X)';
}

// 找到可立即獲勝的位置
function findWinningMove(player){
     const wins = [
     [0,1,2],[3,4,5],[6,7,8],
     [0,3,6],[1,4,7],[2,5,8],
     [0,4,8],[2,4,6]
     ];
     for (let [a,b,c] of wins) {
         const line = [board[a], board[b], board[c]];
         if (line.filter(v => v === player).length === 2 && line.includes(null)) {
            return [a,b,c][line.indexOf(null)];
         } 
     }
    return null;
}

// 隨機選擇空格
function getRandomMove() {
    if (board[4] === null) {
        return 4;
    }
    // 2. 四角（0, 2, 6, 8）
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => board[i] === null);
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // 3. 其他空格
    const empty = board
        .map((v, i) => v === null ? i : null)
        .filter(v => v !== null);

    return empty[Math.floor(Math.random() * empty.length)];
}
    
// 更新畫面
function updateBoard() {
    const cells = document.getElementsByClassName('cell');

    for (let i = 0; i < 9; i++) {
        if (board[i] === 'X') {
            cells[i].innerHTML = `<span class="xMark">X</span>`;
        } else if (board[i] === 'O') {
            cells[i].innerHTML = `<span class="oMark">O</span>`;
        } else {
            cells[i].innerText = '';
        }
    }
}
    // 判斷勝利
function checkWin(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for (let line of wins) {
        const [a,b,c] = line;
        if (board[a]===player && board[b]===player && board[c]===player) {
            winLine = line;
            return true;
        }
    }

    return false;
}

function drawWinLine(line) {
    const boardEl = document.getElementById("board");
    const winEl = document.createElement("div");
    winEl.classList.add("win-line");

    const pos = {
        0:[0,0], 1:[1,0], 2:[2,0],
        3:[0,1], 4:[1,1], 5:[2,1],
        6:[0,2], 7:[1,2], 8:[2,2]
    };

    const [a,b,c] = line;
    const [ax,ay] = pos[a];
    const [cx,cy] = pos[c];

    let x1 = ax * 100 + 50;
    let y1 = ay * 100 + 50;
    let x2 = cx * 100 + 50;
    let y2 = cy * 100 + 50;

    winEl.style.left = Math.min(x1,x2) + "px";
    winEl.style.top = Math.min(y1,y2) + "px";
    winEl.style.width = Math.hypot(x2-x1, y2-y1) + "px";
    winEl.style.transform = `rotate(${Math.atan2(y2-y1, x2-x1)}rad)`;

    boardEl.appendChild(winEl);
}

function removeWinLine() {
    const old = document.querySelector(".win-line");
    if (old) old.remove();
}

// ========== 落子動畫 ==========
function animateMove(i, player) {
    const cells = document.getElementsByClassName("cell");
    const cell = cells[i];
    cell.classList.remove("pop");
    void cell.offsetWidth;
    cell.classList.add("pop");
}


    // 判斷是否平手
function isFull() {
    return board.every(cell => cell !== null);
}
// 結束遊戲
function endGame(message) {
    document.getElementById('status').innerText = message;
    active = false;
}
    
     // 重開一局
function resetGame() {
init();
}
// 初始化
init();

