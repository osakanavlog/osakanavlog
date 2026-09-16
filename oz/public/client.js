'use strict';
// 端末クライアント。
// ・自分の動きは即座に予測して描く。サーバの確定値が来たら差分を吸収する。
// ・他者は 100 ms 遅らせて補間する。揺らぎを隠すため。
// ・遠景の群衆は座標を受け取らない。密度格子から手続き的に生成する。

(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('view'), ctx = cv.getContext('2d');

  const SIM_DT = 50;          // ms。サーバの tick と同じ歩幅
  const INTERP_DELAY = 100;   // ms。他者描画の遅延
  const SPEED = 4.2;          // m/s。サーバと同じ値を持つ

  const S = {
    ws: null, id: null, name: '', coins: 0,
    world: null, cards: null,
    me: { x: 0, y: 0 }, render: { x: 0, y: 0 }, dir: 0,
    seq: 0, pending: [], sentAt: new Map(),
    snaps: [], mid: [], crowd: [], pop: 0,
    lag: 50, rtt: 0, kbps: 0, corr: 0, ses: 0, rej: 0, tick: 0,
    scale: 2.4, keys: {}, chatting: false, duelPending: null, toasts: [],
  };

  // ---- 端末鍵の模擬。端末に残り、外へは出ない --------------------------
  let device = localStorage.getItem('oz.device');
  if (!device) { device = 'dev_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('oz.device', device); }
  $('device').textContent = device;
  $('name').value = localStorage.getItem('oz.name') || '';

  // ---- 通信。模擬遅延を往復の両方向に入れる ---------------------------
  function send(obj) {
    if (!S.ws || S.ws.readyState !== 1) return;
    const s = JSON.stringify(obj);
    if (S.lag > 0) setTimeout(() => { if (S.ws.readyState === 1) S.ws.send(s); }, S.lag);
    else S.ws.send(s);
  }

  function connect(name) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    S.ws = new WebSocket(proto + '//' + location.host);
    S.ws.onopen = () => send({ t: 'hello', name, device });
    S.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (S.lag > 0) setTimeout(() => handle(msg), S.lag); else handle(msg);
    };
    S.ws.onclose = () => toast('接続が切れました。再読み込みしてください。', 'error');
  }

  function handle(m) {
    switch (m.t) {
      case 'welcome':
        S.id = m.id; S.name = m.name; S.world = m.world; S.cards = m.cards; S.coins = m.coins;
        S.me.x = m.spawn[0]; S.me.y = m.spawn[1];
        S.render.x = S.me.x; S.render.y = S.me.y;
        window.Duel.setCards(m.cards);
        $('gate').classList.add('hidden');
        $('hud').classList.remove('hidden');
        toast('入場しました。資格情報の有効期間は 10 分です。');
        break;

      case 's': {
        S.tick = m.k; S.coins = m.coins; S.ses = m.ses; S.rej = m.rej; S.pop = m.pop;
        // 確定値で自分の位置を上書きし、未確定の入力だけを再適用する
        const before = { x: S.me.x, y: S.me.y };
        S.me.x = m.me[0]; S.me.y = m.me[1];
        S.pending = S.pending.filter((p) => p.seq > m.ack);
        for (const p of S.pending) step(S.me, p.dx, p.dy);
        S.corr = Math.hypot(S.me.x - before.x, S.me.y - before.y);
        const t0 = S.sentAt.get(m.ack);
        if (t0) { S.rtt = performance.now() - t0; S.sentAt.clear(); }
        S.snaps.push({ at: performance.now(), near: m.near });
        if (S.snaps.length > 24) S.snaps.shift();
        if (m.mid) S.mid = m.mid;
        if (m.crowd) S.crowd = m.crowd;
        break;
      }

      case 'bw': S.kbps = (m.bytes * 8) / 1000; break;
      case 'toast': toast(m.text, m.kind); break;

      case 'duelReq':
        askConfirm(
          m.name + ' からの対戦申し込み',
          m.name + ' が花札こいこいを申し込んでいます。賭けは ' + m.wager + ' コイン。',
          () => send({ t: 'duelAns', accept: true, confirm: true }),
          () => send({ t: 'duelAns', accept: false }),
          '受ける', '断る'
        );
        break;

      case 'duel':
        if (window.Duel.isOpen()) window.Duel.update(m.view);
        else window.Duel.open(m.view, (action) => send({ t: 'kk', action }));
        break;

      case 'duelEnd': {
        window.Duel.close();
        S.coins = m.coins;
        const r = m.result;
        $('result').classList.remove('hidden');
        if (!r || r.winner === null) {
          $('resultTitle').textContent = '決着つかず';
          $('resultBody').innerHTML = '<div>' + ((r && r.reason) || '対局は終了しました') + '</div><div>コインの移動はありません。</div>';
        } else {
          $('resultTitle').textContent = (m.youWon ? '勝ち　' : '負け　') + r.points + ' 文';
          $('resultBody').innerHTML =
            '<div class="yk">' + r.yaku.map((y) => y.name + ' ' + y.points + '文').join(' / ') + '</div>' +
            '<div>倍率：' + r.reason + '</div>' +
            '<div>コインの移動：' + (m.youWon ? '+' : '-') + r.coins + ' コイン</div>' +
            '<div>所持コイン：' + m.coins + '</div>' +
            '<div style="color:var(--muted);font-size:12px;margin-top:8px">移転したのはコインだけです。アカウントと権限は動いていません。</div>';
        }
        break;
      }
    }
  }

  // ---- 予測。サーバと同じ歩幅・同じ速度で進める -----------------------
  function step(pos, dx, dy) {
    pos.x += dx * SPEED * (SIM_DT / 1000);
    pos.y += dy * SPEED * (SIM_DT / 1000);
    const W = S.world;
    for (const b of W.buildings) {
      const hx = b.w / 2 + 0.6, hy = b.h / 2 + 0.6;
      const ddx = pos.x - b.x, ddy = pos.y - b.y;
      if (Math.abs(ddx) < hx && Math.abs(ddy) < hy) {
        if (hx - Math.abs(ddx) < hy - Math.abs(ddy)) pos.x = b.x + Math.sign(ddx || 1) * hx;
        else pos.y = b.y + Math.sign(ddy || 1) * hy;
      }
    }
    pos.x = Math.max(2, Math.min(W.size - 2, pos.x));
    pos.y = Math.max(2, Math.min(W.size - 2, pos.y));
  }

  setInterval(() => {
    if (!S.world || S.chatting) return;
    let dx = 0, dy = 0;
    if (S.keys['a'] || S.keys['arrowleft']) dx -= 1;
    if (S.keys['d'] || S.keys['arrowright']) dx += 1;
    if (S.keys['w'] || S.keys['arrowup']) dy -= 1;
    if (S.keys['s'] || S.keys['arrowdown']) dy += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; S.dir = Math.atan2(dy, dx); }
    const seq = ++S.seq;
    S.sentAt.set(seq, performance.now());
    send({ t: 'in', seq, dx, dy });
    if (!window.Duel.isOpen()) { S.pending.push({ seq, dx, dy }); step(S.me, dx, dy); }
  }, SIM_DT);

  // ---- 描画 -----------------------------------------------------------
  function resize() {
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  addEventListener('resize', resize); resize();

  // 密度格子から群衆の点を作る。位置はセル番号から決めるので、毎フレーム暴れない。
  function crowdDots(cell, n, t) {
    const out = [];
    const W = S.world;
    const cx = (cell % W.grid) * W.cell, cy = Math.floor(cell / W.grid) * W.cell;
    const k = Math.min(n, 14);
    for (let i = 0; i < k; i++) {
      const h = Math.sin(cell * 12.9898 + i * 78.233) * 43758.5453;
      const h2 = Math.sin(cell * 39.3468 + i * 11.135) * 24634.6345;
      const fx = h - Math.floor(h), fy = h2 - Math.floor(h2);
      const drift = Math.sin(t / 1400 + i + cell) * 2.5;
      out.push([cx + fx * W.cell + drift, cy + fy * W.cell + Math.cos(t / 1700 + i) * 2.5]);
    }
    return out;
  }

  function draw(now) {
    requestAnimationFrame(draw);
    const W = S.world;
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    if (!W) return;

    // 表示位置は確定位置へゆっくり寄せる。補正のガタつきを隠すため。
    S.render.x += (S.me.x - S.render.x) * 0.25;
    S.render.y += (S.me.y - S.render.y) * 0.25;

    const sc = S.scale, cw = innerWidth / 2, ch = innerHeight / 2;
    const X = (x) => cw + (x - S.render.x) * sc;
    const Y = (y) => ch + (y - S.render.y) * sc;

    // 地面の格子
    ctx.strokeStyle = '#11141f'; ctx.lineWidth = 1;
    const gstep = 50;
    ctx.beginPath();
    for (let g = 0; g <= W.size; g += gstep) { ctx.moveTo(X(g), Y(0)); ctx.lineTo(X(g), Y(W.size)); ctx.moveTo(X(0), Y(g)); ctx.lineTo(X(W.size), Y(g)); }
    ctx.stroke();

    // 関心管理の境界
    ctx.strokeStyle = 'rgba(127,156,255,.16)'; ctx.beginPath(); ctx.arc(X(S.render.x), Y(S.render.y), W.nearR * sc, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(74,90,128,.14)'; ctx.beginPath(); ctx.arc(X(S.render.x), Y(S.render.y), W.midR * sc, 0, 7); ctx.stroke();

    // 遠景：密度格子から生成した群衆
    ctx.fillStyle = '#47547a';
    for (let i = 0; i < S.crowd.length; i += 2) {
      const dots = crowdDots(S.crowd[i], S.crowd[i + 1], now);
      for (const [x, y] of dots) { const px = X(x), py = Y(y); if (px > -20 && px < innerWidth + 20 && py > -20 && py < innerHeight + 20) ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4); }
    }

    // 建物
    for (const b of W.buildings) {
      ctx.fillStyle = '#131826'; ctx.strokeStyle = '#2b3247';
      ctx.fillRect(X(b.x - b.w / 2), Y(b.y - b.h / 2), b.w * sc, b.h * sc);
      ctx.strokeRect(X(b.x - b.w / 2), Y(b.y - b.h / 2), b.w * sc, b.h * sc);
      ctx.fillStyle = '#5a657f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.name, X(b.x), Y(b.y));
    }

    // 中景：代表点のみ
    for (const [x, y, hue] of S.mid) {
      ctx.fillStyle = 'hsla(' + hue + ',28%,46%,.6)';
      ctx.beginPath(); ctx.arc(X(x), Y(y), 1.8, 0, 7); ctx.fill();
    }

    // 近傍：100 ms 前の状態を 2 スナップショット間で補間する
    const target = now - INTERP_DELAY;
    let a = null, b = null;
    for (let i = S.snaps.length - 1; i >= 0; i--) { if (S.snaps[i].at <= target) { a = S.snaps[i]; b = S.snaps[i + 1] || S.snaps[i]; break; } }
    if (!a && S.snaps.length) { a = S.snaps[0]; b = S.snaps[0]; }
    let nearCount = 0;
    if (a) {
      const span = Math.max(1, b.at - a.at);
      const k = Math.max(0, Math.min(1, (target - a.at) / span));
      const bmap = new Map(b.near.map((e) => [e[0], e]));
      for (const e of a.near) {
        const e2 = bmap.get(e[0]) || e;
        const x = e[1] + (e2[1] - e[1]) * k, y = e[2] + (e2[2] - e[2]) * k;
        drawAvatar(X(x), Y(y), e[4], e[3], e[5] || '', e[6] || '', sc);
        nearCount++;
      }
    }

    // 自分
    drawAvatar(X(S.render.x), Y(S.render.y), 210, S.dir, S.name + '（あなた）', '', sc, true);

    drawMinimap();
    hud(nearCount);
  }

  function drawAvatar(px, py, hue, dir, name, chat, sc, self) {
    const r = Math.max(4.6, 1.15 * sc);
    // 足元の輪。近傍として厳密に同期している個体であることを示す
    ctx.fillStyle = self ? 'rgba(127,156,255,.16)' : 'hsla(' + hue + ',50%,60%,.12)';
    ctx.beginPath(); ctx.arc(px, py, r * 1.9, 0, 7); ctx.fill();
    ctx.fillStyle = self ? '#7f9cff' : 'hsl(' + hue + ',58%,64%)';
    ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    ctx.strokeStyle = self ? '#cdd8ff' : 'rgba(6,8,14,.6)'; ctx.lineWidth = self ? 2 : 1.2; ctx.stroke();
    // 向き
    ctx.strokeStyle = self ? '#cdd8ff' : 'hsla(' + hue + ',55%,78%,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(dir) * r * 1.9, py + Math.sin(dir) * r * 1.9); ctx.stroke();
    if (name && sc > 1.8) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = self ? '#cdd8ff' : '#93a0bd';
      ctx.fillText(name, px, py - r - 9);
    }
    if (chat) {
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(chat).width + 14;
      ctx.fillStyle = 'rgba(12,15,24,.92)'; ctx.strokeStyle = '#39415a';
      ctx.fillRect(px - w / 2, py - r - 40, w, 22); ctx.strokeRect(px - w / 2, py - r - 40, w, 22);
      ctx.fillStyle = '#e9ecf5'; ctx.fillText(chat, px, py - r - 25);
    }
  }

  function drawMinimap() {
    const W = S.world, size = 120, pad = 12;
    const ox = innerWidth - size - pad, oy = innerHeight - size - pad - 96;
    ctx.fillStyle = 'rgba(10,13,21,.85)'; ctx.strokeStyle = '#262c3c';
    ctx.fillRect(ox, oy, size, size); ctx.strokeRect(ox, oy, size, size);
    const k = size / W.size;
    ctx.fillStyle = '#1a2030';
    for (const b of W.buildings) ctx.fillRect(ox + (b.x - b.w / 2) * k, oy + (b.y - b.h / 2) * k, b.w * k, b.h * k);
    for (let i = 0; i < S.crowd.length; i += 2) {
      const cell = S.crowd[i], n = S.crowd[i + 1];
      const cx = (cell % W.grid) * W.cell, cy = Math.floor(cell / W.grid) * W.cell;
      ctx.fillStyle = 'rgba(127,156,255,' + Math.min(0.6, 0.08 + n * 0.03) + ')';
      ctx.fillRect(ox + cx * k, oy + cy * k, W.cell * k, W.cell * k);
    }
    ctx.fillStyle = '#7f9cff';
    ctx.fillRect(ox + S.me.x * k - 1.5, oy + S.me.y * k - 1.5, 3, 3);
    ctx.fillStyle = '#6f7a92'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('区画全体 ' + W.size + '×' + W.size + ' m', ox, oy - 5);
  }

  function hud(nearCount) {
    const farTotal = S.crowd.reduce((s, v, i) => (i % 2 ? s + v : s), 0);
    const ses = String(Math.floor(S.ses / 60)).padStart(2, '0') + ':' + String(S.ses % 60).padStart(2, '0');
    $('hudStats').innerHTML =
      'tick <b>' + S.tick + '</b>　座標 <b>' + S.me.x.toFixed(1) + ', ' + S.me.y.toFixed(1) + '</b><br>' +
      '近傍 <b>' + nearCount + '</b>　中景 <b>' + S.mid.length + '</b>　遠景 <b>' + farTotal + '</b>　総数 <b>' + S.pop + '</b><br>' +
      '下り <b>' + S.kbps.toFixed(1) + ' kbps</b>　往復 <b>' + S.rtt.toFixed(0) + ' ms</b><br>' +
      '予測補正 <b>' + (S.corr * 100).toFixed(1) + ' cm</b>　棄却 <b>' + S.rej + '</b><br>' +
      'コイン <b>' + S.coins + '</b>　資格情報 <b class="' + (S.ses < 60 ? 'warn' : '') + '">' + ses + '</b>';
    $('hint').innerHTML = 'WASD 移動　E 近くの人と対戦　C 相手なしで対戦<br>Enter 発言　ホイールで拡大縮小';
  }

  // ---- 入力 -----------------------------------------------------------
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (S.chatting) { if (k === 'escape') closeChat(); return; }
    if (window.Duel.isOpen() || !S.world) return;
    if (k === 'enter') { e.preventDefault(); openChat(); return; }
    if (k === 'e') { askDuel(false); return; }
    if (k === 'c') { askDuel(true); return; }
    S.keys[k] = true;
  });
  addEventListener('keyup', (e) => { S.keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { S.keys = {}; });
  addEventListener('wheel', (e) => { S.scale = Math.max(1.3, Math.min(14, S.scale * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: true });

  function openChat() { S.chatting = true; S.keys = {}; $('chatForm').classList.remove('hidden'); $('chatInput').focus(); }
  function closeChat() { S.chatting = false; $('chatForm').classList.add('hidden'); $('chatInput').value = ''; cv.focus(); }
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('chatInput').value.trim();
    if (v) send({ t: 'chat', text: v });
    closeChat();
  };

  function askDuel(cpu) {
    askConfirm(
      cpu ? 'OZ の対戦相手と花札こいこい' : '近くの人に対戦を申し込む',
      '賭けは ' + S.world.wager + ' コインです。' + (cpu ? '相手はサーバ側の対戦相手です。' : '半径 ' + S.world.duelRange + ' m 以内の相手を探します。'),
      () => send({ t: 'duel', cpu, confirm: true })
    );
  }

  function askConfirm(title, body, onYes, onNo, yesLabel, noLabel) {
    $('confirmTitle').textContent = title;
    $('confirmBody').textContent = body;
    $('confirmYes').textContent = yesLabel || '確認して実行';
    $('confirmNo').textContent = noLabel || 'やめる';
    $('confirm').classList.remove('hidden');
    $('confirmYes').onclick = () => { $('confirm').classList.add('hidden'); onYes && onYes(); };
    $('confirmNo').onclick = () => { $('confirm').classList.add('hidden'); onNo && onNo(); };
  }

  $('duelQuit').onclick = () => send({ t: 'quitDuel' });
  $('resultClose').onclick = () => $('result').classList.add('hidden');

  function toast(text, kind) {
    const d = document.createElement('div');
    d.className = 'toast' + (kind === 'error' ? ' error' : '');
    d.textContent = text;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 5000);
  }

  $('lag').onchange = (e) => { S.lag = Number(e.target.value); };
  $('enter').onclick = () => {
    const name = ($('name').value || '').trim() || '名無し';
    localStorage.setItem('oz.name', name);
    connect(name);
  };
  $('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('enter').click(); });

  requestAnimationFrame(draw);
})();
