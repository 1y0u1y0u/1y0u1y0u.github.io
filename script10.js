(() => {
  "use strict";

  // === 常數與狀態（對應講義的 BoardSize / boardState / currentPlayer） ===
  const BoardSize = 8;
  const EMPTY = 0, BLACK = 1, WHITE = 2;

  const DIRS = [
    [-1,-1], [-1,0], [-1,1],
    [0,-1],          [0,1],
    [1,-1],  [1,0],  [1,1]
  ];

  // DOM
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const scoreEl = document.getElementById("score");
  const btnRestart = document.getElementById("btnRestart");
  const vsComputerEl = document.getElementById("vsComputer");
  const difficultyEl = document.getElementById("difficulty");

  // Game state
  let boardState = make2D(BoardSize, BoardSize, EMPTY);
  let currentPlayer = BLACK; // 黑先手（玩家）
  let isAnimating = false;   // 防止動畫期間操作
  let rnd = Math.random;
    
  let gameOver = false;


  // UI cells cache
  let cellDivs = make2D(BoardSize, BoardSize, null);

  // === InitBoardUI（Web 版） ===
  function initBoardUI(){
    boardEl.innerHTML = "";
    for(let r=0;r<BoardSize;r++){
      for(let c=0;c<BoardSize;c++){
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.addEventListener("click", onCellClick);
        boardEl.appendChild(cell);
        cellDivs[r][c] = cell;
      }
    }
  }

  // === InitGame（對應講義初始化中央四子） ===
  function initGame(){
    gameOver = false; 
    boardState = make2D(BoardSize, BoardSize, EMPTY);
    boardState[3][3] = WHITE;
    boardState[3][4] = BLACK;
    boardState[4][3] = BLACK;
    boardState[4][4] = WHITE;

    currentPlayer = BLACK;
    isAnimating = false;
    refreshBoard();

    // 若你想支援「白先」等玩法，可在這裡擴充
  }

  // === Cell_Click（點擊落子） ===
  async function onCellClick(e){
    if(isAnimating) return;
    const cell = e.currentTarget;
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    
    if (!isHumanPlayer(currentPlayer)) return;

    if(!isValidMove(boardState, r, c, currentPlayer)) return;

    await applyMoveWithSequentialFlips(boardState, r, c, currentPlayer, true);

    // 換手到白（電腦 / 或第二人）
    currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
    refreshBoard();
    checkGameOver();

    // 若開啟電腦對戰，讓電腦走
    if (vsComputerEl.checked && !isHumanPlayer(currentPlayer)) {
  await computerTurn();
}


  }

  // === 電腦回合處理（含 Pass / 結束） ===
  async function computerTurn(){
    if(isAnimating) return;

    // 若白棋無合法步：pass 給黑
    if(!hasAnyValidMove(boardState, WHITE)){
      currentPlayer = BLACK;
      refreshBoard();
      // 黑也無步 => 結束
      if(!hasAnyValidMove(boardState, BLACK)) endGame();
      return;
    }

    isAnimating = true;
    await sleep(220); // 小延遲，讓人感覺在「思考」
    const diff = difficultyEl.value;

    let move = null;
    if(diff === "basic"){
      move = pickMoveBasic(boardState, WHITE);
    }else{
      move = pickMoveAdvanced(boardState, WHITE);
    }

    if(move){
      await applyMoveWithSequentialFlips(boardState, move.r, move.c, WHITE, true);
    }

    currentPlayer = BLACK;
    isAnimating = false;
    refreshBoard();

    // 黑無合法步：pass 給白（若白也無則結束）
    if(!hasAnyValidMove(boardState, BLACK)){
      currentPlayer = WHITE;
      refreshBoard();
      if(!hasAnyValidMove(boardState, WHITE)) endGame();
      else await computerTurn(); // 連續 pass 時讓電腦繼續走
    }
  }

  // === RefreshBoard（顯示棋子、提示合法步與可翻數） ===
  function refreshBoard(){
    let black = 0, white = 0;

    for(let r=0;r<BoardSize;r++){
      for(let c=0;c<BoardSize;c++){
        const cell = cellDivs[r][c];
        cell.classList.remove("hint");
        cell.innerHTML = "";

        const s = boardState[r][c];
        if(s === BLACK){
          black++;
          cell.appendChild(makeDisc("black"));
        }else if(s === WHITE){
          white++;
          cell.appendChild(makeDisc("white"));
        }else{
          // 空格：提示合法步（依照講義：淡綠 + 顯示可翻數）
          const flips = countFlips(boardState, r, c, currentPlayer);
          if(flips > 0){
            cell.classList.add("hint");
            const t = document.createElement("div");
            t.className = "hint-text";
            t.textContent = String(flips);
            cell.appendChild(t);
          }
        }
      }
    }

    scoreEl.textContent = `黑棋: ${black}　白棋: ${white}`;
    statusEl.textContent = (currentPlayer === BLACK) ? "目前輪到：黑棋" : "目前輪到：白棋";

    // 判定遊戲是否結束
    /*if(!hasAnyValidMove(boardState, BLACK) && !hasAnyValidMove(boardState, WHITE)){
      endGame(black, white);
    }*/
  }

  function endGame(blackCount, whiteCount){
    const { black, white } = (blackCount == null) ? getCounts(boardState) : { black:blackCount, white:whiteCount };
    let winner = "平手";
    if(black > white) winner = "黑棋";
    else if(white > black) winner = "白棋";

    // 用 alert 簡化（也可改成 modal）
    alert(`遊戲結束！\n黑棋 ${black} : 白棋 ${white}\n勝者：${winner}`);
  }

  // === 規則：IsValidMove / CountFlips / PlaceDisc（Web 版本） ===
  function isValidMove(b, row, col, player){
    if(b[row][col] !== EMPTY) return false;
    const opponent = (player === BLACK) ? WHITE : BLACK;

    for(const [dr,dc] of DIRS){
      let r = row + dr, c = col + dc;
      let hasOpponent = false;

      while(inBounds(r,c) && b[r][c] === opponent){
        hasOpponent = true;
        r += dr; c += dc;
      }
      if(hasOpponent && inBounds(r,c) && b[r][c] === player) return true;
    }
    return false;
  }

  function countFlips(b, row, col, player){
    if(b[row][col] !== EMPTY) return 0;
    const opponent = (player === BLACK) ? WHITE : BLACK;
    let total = 0;

    for(const [dr,dc] of DIRS){
      let r = row + dr, c = col + dc;
      let count = 0;

      while(inBounds(r,c) && b[r][c] === opponent){
        count++;
        r += dr; c += dc;
      }
      if(count > 0 && inBounds(r,c) && b[r][c] === player){
        total += count;
      }
    }
    return total;
  }

  function hasAnyValidMove(b, player){
    for(let r=0;r<BoardSize;r++){
      for(let c=0;c<BoardSize;c++){
        if(isValidMove(b, r, c, player)) return true;
      }
    }
    return false;
  }

  // 取得「依方向」的翻棋座標序列（用於依序翻棋）
  function getFlipsByDirection(b, row, col, player){
    const opponent = (player === BLACK) ? WHITE : BLACK;
    const bundles = []; // 每個方向一串 flips（依方向順序）
    for(const [dr,dc] of DIRS){
      let r = row + dr, c = col + dc;
      const flips = [];

      while(inBounds(r,c) && b[r][c] === opponent){
        flips.push([r,c]);
        r += dr; c += dc;
      }
      if(flips.length > 0 && inBounds(r,c) && b[r][c] === player){
        bundles.push(flips);
      }
    }
    return bundles;
  }

  // === 下子 + 依序翻棋（逐顆翻轉動畫） ===
  async function applyMoveWithSequentialFlips(b, row, col, player, animate){
    // 先放子
    b[row][col] = player;
    if(animate){
      renderSingleCell(row, col, player, { pop:true });
    }else{
      renderSingleCell(row, col, player, { pop:false });
    }

    const bundles = getFlipsByDirection(b, row, col, player);
    // 扁平化成「依序翻棋隊列」：方向1(由近到遠) -> 方向2 -> ...
    const queue = [];
    for(const flips of bundles){
      for(const [r,c] of flips) queue.push([r,c]);
    }

    // 逐顆翻
    if(queue.length > 0){
      isAnimating = true;
      for(const [r,c] of queue){
        if(animate){
          await flipOne(r, c, player);
        }else{
          b[r][c] = player;
        }
      }
      isAnimating = false;
    }

    // 最終更新盤面數據（動畫翻時已同步 b[r][c]）
    refreshBoard();
  }

  async function flipOne(r, c, toPlayer){
    // 先對 UI 做翻轉動畫；到 50% 再換顏色
    const cell = cellDivs[r][c];
    const existingDisc = cell.querySelector(".disc");
    if(!existingDisc){
      // 理論上不會發生；保底
      boardState[r][c] = toPlayer;
      renderSingleCell(r, c, toPlayer, { pop:false });
      await sleep(Number(getComputedStyle(document.documentElement).getPropertyValue("--flip-ms")) || 220);
      return;
    }

    existingDisc.classList.add("flipping");

    // 半程：交換棋色（同時更新 boardState）
    const flipMs = Number(getComputedStyle(document.documentElement).getPropertyValue("--flip-ms")) || 220;
    await sleep(Math.floor(flipMs / 2));

    boardState[r][c] = toPlayer;
    // 直接改 class，保持同一顆 disc
    existingDisc.classList.toggle("black", toPlayer === BLACK);
    existingDisc.classList.toggle("white", toPlayer === WHITE);

    // 完成
    await sleep(Math.ceil(flipMs / 2));
    existingDisc.classList.remove("flipping");
  }

  function renderSingleCell(r, c, player, { pop }){
    const cell = cellDivs[r][c];
    cell.classList.remove("hint");
    cell.innerHTML = "";
    const disc = makeDisc(player === BLACK ? "black" : "white");
    if(pop) disc.classList.add("pop");
    cell.appendChild(disc);
  }

  function makeDisc(color){
    const d = document.createElement("div");
    d.className = `disc ${color}`;
    return d;
  }

  // === 電腦棋力：基本（講義策略：Greedy + Corner Priority） ===
  function pickMoveBasic(b, player){
    const moves = getAllValidMoves(b, player);
    if(moves.length === 0) return null;

    // 計算翻棋數
    let best = [];
    let maxFlip = -1;
    for(const m of moves){
      const flips = countFlips(b, m.r, m.c, player);
      if(flips > maxFlip){
        maxFlip = flips;
        best = [{...m, flips}];
      }else if(flips === maxFlip){
        best.push({...m, flips});
      }
    }

    // 角落優先
    const corners = new Set(["0,0","0,7","7,0","7,7"]);
    const cornerMoves = best.filter(m => corners.has(`${m.r},${m.c}`));
    if(cornerMoves.length > 0){
      return cornerMoves[0];
    }

    // 無角落：從 best 隨機挑
    return best[Math.floor(rnd() * best.length)];
  }

  // === 電腦棋力：進階（Minimax + Heuristic 評分） ===
  function pickMoveAdvanced(b, player){
    const moves = getAllValidMoves(b, player);
    if(moves.length === 0) return null;

    // 深度可調：3~4 已足夠明顯提升；避免瀏覽器太慢
    const depth = 4;
    const opponent = (player === BLACK) ? WHITE : BLACK;

    let bestMove = null;
    let bestScore = -Infinity;

    for(const m of moves){
      const b2 = cloneBoard(b);
      applyMoveNoAnim(b2, m.r, m.c, player);

      const score = minimax(b2, depth-1, false, player, -Infinity, Infinity);
      if(score > bestScore){
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove || moves[0];

    function minimax(node, d, isMax, me, alpha, beta){
      const you = (me === BLACK) ? WHITE : BLACK;

      // 終止條件：深度到或無棋可走（雙方都無 => 結束）
      const meHas = hasAnyValidMove(node, me);
      const youHas = hasAnyValidMove(node, you);
      if(d === 0 || (!meHas && !youHas)){
        return evaluate(node, me);
      }

      // 若當前方無步：pass
      const current = isMax ? me : you;
      if(!hasAnyValidMove(node, current)){
        return minimax(node, d-1, !isMax, me, alpha, beta);
      }

      const candidates = getAllValidMoves(node, current);

      if(isMax){
        let v = -Infinity;
        for(const mv of candidates){
          const child = cloneBoard(node);
          applyMoveNoAnim(child, mv.r, mv.c, current);
          v = Math.max(v, minimax(child, d-1, false, me, alpha, beta));
          alpha = Math.max(alpha, v);
          if(beta <= alpha) break; // alpha-beta
        }
        return v;
      }else{
        let v = Infinity;
        for(const mv of candidates){
          const child = cloneBoard(node);
          applyMoveNoAnim(child, mv.r, mv.c, current);
          v = Math.min(v, minimax(child, d-1, true, me, alpha, beta));
          beta = Math.min(beta, v);
          if(beta <= alpha) break;
        }
        return v;
      }
    }
  }

  // 不做動畫的下子（for AI search）
  function applyMoveNoAnim(b, row, col, player){
    b[row][col] = player;
    const bundles = getFlipsByDirection(b, row, col, player);
    for(const flips of bundles){
      for(const [r,c] of flips){
        b[r][c] = player;
      }
    }
  }

  // Heuristic evaluation：角落、行動力、子數差、危險格（X/C 格）
  function evaluate(b, me){
    const you = (me === BLACK) ? WHITE : BLACK;

    // 1) 角落（高權重）
    const corners = [[0,0],[0,7],[7,0],[7,7]];
    let cornerScore = 0;
    for(const [r,c] of corners){
      if(b[r][c] === me) cornerScore += 1;
      else if(b[r][c] === you) cornerScore -= 1;
    }

    // 2) 行動力（mobility）
    const myMoves = getAllValidMoves(b, me).length;
    const yourMoves = getAllValidMoves(b, you).length;
    const mobility = (myMoves - yourMoves);

    // 3) 子數差（disc diff）
    const { black, white } = getCounts(b);
    const discDiff = (me === BLACK) ? (black - white) : (white - black);

    // 4) 危險格：角落旁（X/C squares）避免早期亂踩
    const danger = new Set([
      "1,1","1,6","6,1","6,6", // X-squares
      "0,1","1,0","0,6","1,7","6,0","7,1","6,7","7,6" // C-squares
    ]);
    let dangerScore = 0;
    for(const key of danger){
      const [r,c] = key.split(",").map(Number);
      if(b[r][c] === me) dangerScore -= 1;
      else if(b[r][c] === you) dangerScore += 1;
    }

    // 權重（可自行調）
    const W_CORNER = 120;
    const W_MOB = 8;
    const W_DIFF = 1;
    const W_DANGER = 12;

    return cornerScore * W_CORNER + mobility * W_MOB + discDiff * W_DIFF + dangerScore * W_DANGER;
  }

  // === 工具函式 ===
  function getAllValidMoves(b, player){
    const moves = [];
    for(let r=0;r<BoardSize;r++){
      for(let c=0;c<BoardSize;c++){
        if(isValidMove(b, r, c, player)) moves.push({r,c});
      }
    }
    return moves;
  }

  function getCounts(b){
    let black = 0, white = 0;
    for(let r=0;r<BoardSize;r++){
      for(let c=0;c<BoardSize;c++){
        if(b[r][c] === BLACK) black++;
        else if(b[r][c] === WHITE) white++;
      }
    }
    return { black, white };
  }

  function inBounds(r,c){
    return r>=0 && r<BoardSize && c>=0 && c<BoardSize;
  }

  function make2D(rows, cols, fill){
    return Array.from({length: rows}, () => Array.from({length: cols}, () => fill));
  }

  function cloneBoard(b){
    return b.map(row => row.slice());
  }

  function sleep(ms){
    return new Promise(res => setTimeout(res, ms));
  }

  // === 事件：重新開始 / 切換對戰 / 切換難度 ===
  btnRestart.addEventListener("click", () => {
    if(isAnimating) return;
    initGame();
  });

  vsComputerEl.addEventListener("change", async () => {
    // 若切回「與電腦對戰」，且剛好輪到白棋，讓電腦補走
    if(vsComputerEl.checked && currentPlayer === WHITE && !isAnimating){
      await computerTurn();
    }
  });

  difficultyEl.addEventListener("change", () => {
    // 不強制立即重算；下一手生效
  });

  // === 啟動 ===
  initBoardUI();
  initGame();
    
function checkGameOver() {
  if (gameOver) return;

  const blackCanMove = hasAnyValidMove(boardState, BLACK);
  const whiteCanMove = hasAnyValidMove(boardState, WHITE);

  if (!blackCanMove && !whiteCanMove) {
    gameOver = true;
    setTimeout(showResult, 300); // 等動畫跑完
  }
}

function showResult() {
  const { black, white } = getCounts(boardState);

  let result;
  if (black > white) result = "黑棋獲勝";
  else if (white > black) result = "白棋獲勝";
  else result = "平手";

  alert(
    `遊戲結束！\n` +
    `黑棋：${black}\n` +
    `白棋：${white}\n\n` +
    `${result}`
  );
}

 function isHumanPlayer(player) {
  // 勾選「與電腦對戰」時：黑是人、白是電腦
  if (vsComputerEl.checked) {
    return player === BLACK;
  }
  // 玩家 vs 玩家：兩邊都是人
  return true;
}


})();
