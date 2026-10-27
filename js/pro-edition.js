/* SkyRoute Pro Beta — 独立存档: 所有 localStorage 键加 "srpro:" 前缀, 与免费版互不影响 (GPL-2.0-or-later) */
(function () {
  try {
    var S = window.Storage && Storage.prototype, P = 'srpro:';
    if (!S || S.__srpro) return; S.__srpro = true;
    var g = S.getItem, s = S.setItem, r = S.removeItem, k = S.key, c = S.clear;
    function pk(x) { x = String(x); return x.indexOf(P) === 0 ? x : P + x; }
    S.getItem = function (x) { return g.call(this, pk(x)); };
    S.setItem = function (x, v) { return s.call(this, pk(x), v); };
    S.removeItem = function (x) { return r.call(this, pk(x)); };
    S.clear = function () { var a = []; for (var i = 0; i < this.length; i++) { var n = k.call(this, i); if (n && n.indexOf(P) === 0) a.push(n); } for (var j = 0; j < a.length; j++) r.call(this, a[j]); };
  } catch (e) { /* */ }
})();
