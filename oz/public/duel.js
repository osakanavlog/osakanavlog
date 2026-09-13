'use strict';
// 対戦ルームの UI。状態はすべてサーバが持ち、ここは受け取った view を描くだけ。
// 手札の中身も相手の手札枚数も、サーバが視点ごとに絞って送ってくる。

window.Duel = (function () {
  let CARDS = [];
  let send = null;
  let view = null;

  const el = (id) => document.getElementById(id);
  const BADGE = { hikari: '光', tane: '種', kasu: 'カス' };

  function classOf(c) {
    if (c.type === 'tan') return 'tan-' + c.tan;
    return c.type;
  }
  function badgeOf(c) {
    if (c.type === 'tan') return c.tan === 'aka' ? '赤' : c.tan === 'ao' ? '青' : '短';
    return BADGE[c.type];
  }

  // 札 1 枚の DOM。mini は取り札の一覧用。
  function cardEl(id, opt) {
    opt = opt || {};
    const c = CARDS[id];
    const d = document.createElement('div');
    d.className = 'card ' + classOf(c) + (opt.mini ? ' mini' : '');
    d.title = c.season + '・' + c.label;
    d.innerHTML =
      '<div class="mon">' + c.m + '月</div>' +
      '<div class="glyph">' + c.monthName.slice(0, 1) + '</div>' +
      '<div class="lab">' + c.label + '</div>' +
      '<div class="badge">' + badgeOf(c) + '</div>';
    if (opt.mini) d.innerHTML = '<div class="glyph">' + c.monthName.slice(0, 1) + '</div><div class="badge">' + badgeOf(c) + '</div>';
    if (opt.pick) { d.classList.add('pick'); d.onclick = opt.pick; }
    if (opt.match) d.classList.add('match');
    if (opt.dim) d.classList.add('dim');
    return d;
  }

  function sideHtml(seat, label) {
    const y = view.yaku[seat];
    const koi = view.koi[seat] ? '<span class="koi">こいこい ×' + view.koi[seat] + '</span>' : '';
    const yk = y.total > 0
      ? y.list.map((x) => x.name + ' ' + x.points + '文').join(' / ') + '　計 ' + y.total + '文'
      : '役なし';
    return '<div class="side-head"><span><span class="nm">' + label + '</span>' + koi +
      '</span><span class="yaku">' + yk + '</span></div>';
  }

  function renderSide(node, seat, label) {
    node.innerHTML = sideHtml(seat, label);
    const wrap = document.createElement('div');
    wrap.className = 'cards';
    const order = { hikari: 0, tane: 1, tan: 2, kasu: 3 };
    view.piles[seat].slice().sort((a, b) => order[CARDS[a].type] - order[CARDS[b].type] || CARDS[a].m - CARDS[b].m)
      .forEach((id) => wrap.appendChild(cardEl(id, { mini: true })));
    node.appendChild(wrap);
  }

  function myTurn() { return view.turn === view.you && view.phase !== 'over'; }

  function render() {
    const me = view.you, opp = 1 - me;
    el('duelTitle').textContent = view.seats[me].name + '　対　' + view.seats[opp].name;
    el('duelMeta').innerHTML =
      '賭け ' + view.wager + ' コイン（アカウントは移転しません）<br>' +
      '山 ' + view.deckCount + ' 枚 ／ 相手の手札 ' + view.oppHandCount + ' 枚';
    el('deckCount').textContent = '山 ' + view.deckCount + ' 枚';

    renderSide(el('oppSide'), opp, view.seats[opp].name + 'の取り札');
    renderSide(el('mySide'), me, 'あなたの取り札');

    // 場
    const field = el('fieldCards');
    field.innerHTML = '';
    const choosing = view.phase === 'chooseHand' && myTurn();
    const playedMonth = choosing ? CARDS[view.pending.card].m : null;
    view.field.forEach((id) => {
      const isMatch = choosing && view.pending.matches.includes(id);
      field.appendChild(cardEl(id, {
        match: isMatch,
        dim: choosing && !isMatch,
        pick: isMatch ? () => send({ type: 'choose', card: id }) : null,
      }));
    });

    // 手札
    const hand = el('handCards');
    hand.innerHTML = '';
    const canPlay = view.phase === 'play' && myTurn();
    view.hand.forEach((id) => {
      const hasMatch = view.field.some((f) => CARDS[f].m === CARDS[id].m);
      hand.appendChild(cardEl(id, {
        match: canPlay && hasMatch,
        pick: canPlay ? () => send({ type: 'play', card: id }) : null,
      }));
    });

    // 指示
    let prompt = '';
    if (view.phase === 'over') prompt = '対局終了';
    else if (!myTurn()) prompt = '相手の手番です';
    else if (view.phase === 'play') prompt = '出す札を選んでください（枠つきは場の札と同月）';
    else if (view.phase === 'chooseHand') prompt = CARDS[view.pending.card].label + '（' + playedMonth + '月）で取る札を、場から選んでください';
    else if (view.phase === 'koikoi') prompt = '役ができました。あがるか、こいこいか';
    el('prompt').textContent = prompt;

    el('choice').classList.toggle('hidden', !(view.phase === 'koikoi' && myTurn()));
    el('duelLog').innerHTML = view.log.map((l) => '<div>' + l + '</div>').join('');
    el('duelLog').scrollTop = 1e6;
  }

  return {
    setCards(c) { CARDS = c; },
    cardEl,
    open(v, sendFn) {
      view = v; send = sendFn;
      el('duel').classList.remove('hidden');
      el('btnAgari').onclick = () => send({ type: 'agari' });
      el('btnKoi').onclick = () => send({ type: 'koikoi' });
      render();
    },
    update(v) { if (!view) return; view = v; render(); },
    close() { view = null; el('duel').classList.add('hidden'); },
    isOpen() { return !!view; },
  };
})();
