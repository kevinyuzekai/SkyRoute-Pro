/* ==========================================================================
   SkyRoute Pro Beta 0.1 — 故障模拟 / 天气面板 + METAR / 多机位回放 / 航司涂装
   GPL-2.0-or-later (与 Pro 版其余部分相同, 见 LICENSE-GPL.txt)
   ========================================================================== */
(function (global) {
  'use strict';
  var FS = global.FS = global.FS || {};
  var U = FS.Utils || FS.U || {};
  function sim() { return FS.sim || global.sim; }
  function $(t, a, h) { var e = document.createElement(t); if (a) for (var k in a) { if (k === 'style') e.style.cssText = a[k]; else e.setAttribute(k, a[k]); } if (h != null) e.innerHTML = h; return e; }

  /* ---------------------------------------------------------------- 1. 故障 */
  var DEF = [
    // id, 名称, ECAM(空客), EICAS(波音), 等级(3 红 / 2 琥珀)
    ['eng1', '1 号发动机失效', 'ENG 1 FAIL', 'ENG FAIL L', 2],
    ['eng2', '2 号发动机失效', 'ENG 2 FAIL', 'ENG FAIL R', 2],
    ['fire1', '1 号发动机火警', 'ENG 1 FIRE', 'FIRE ENG L', 3],
    ['fire2', '2 号发动机火警', 'ENG 2 FIRE', 'FIRE ENG R', 3],
    ['hyd0', '液压系统 1 (绿 / A / L) 失效', 'HYD G SYS LO PR', 'HYD PRESS SYS L', 2],
    ['hyd1', '液压系统 2 (蓝 / B / C) 失效', 'HYD B SYS LO PR', 'HYD PRESS SYS C', 2],
    ['hyd2', '液压系统 3 (黄 / R) 失效', 'HYD Y SYS LO PR', 'HYD PRESS SYS R', 2],
    ['gear', '起落架卡滞', 'L/G GEAR NOT DOWNLOCKED', 'GEAR DISAGREE', 2],
    ['flap', '襟翼卡滞', 'F/CTL FLAPS LOCKED', 'FLAPS DRIVE', 2],
    ['ias', '空速不可靠 (皮托管堵塞)', 'NAV IAS DISAGREE', 'IAS DISAGREE', 2],
    ['leak', '燃油泄漏', 'FUEL LEAK', 'FUEL DISAGREE', 2],
    ['press', '客舱失压', 'CAB PR EXCESS CAB ALT', 'CABIN ALTITUDE', 3],
    ['ap', '自动驾驶故障', 'AUTO FLT AP OFF', 'AUTOPILOT DISC', 3],
    ['brakes', '刹车失效', 'BRAKES SYS FAULT', 'BRAKE SOURCE', 2]
  ];
  var F = FS.ProFailures = { active: {}, def: DEF, agent: {}, cabinAltFt: 0,
    set: function (id, on) {
      var s = sim(), fm = s && s.fm; on = !!on;
      if (on === !!this.active[id]) return;
      this.active[id] = on;
      if (on && fm) {
        if (id === 'gear') this.gearJam = fm.gearPos;
        if (id === 'flap') { this.flapJam = fm.flapPos; this.slatJam = fm.slatPos; }
        if (id === 'ias') { this.iasFrozen = fm.iasKt || 0; this.altFrozen = fm.pos ? fm.pos.y : 0; }
        if (id === 'ap' && s.ap) s.ap.disengage('AP FAULT');
        if (id === 'fire1' || id === 'fire2') this.agent[id] = 0;
      }
      if (!on && fm && (id === 'fire1' || id === 'fire2')) { var e = fm.engines[id === 'fire1' ? 0 : 1]; if (e) e.fireWarning = false; }
      if (FS.Bus) FS.Bus.emit('pro:failure', { id: id, on: on });
    },
    clearAll: function () { var self = this; Object.keys(this.active).forEach(function (k) { self.set(k, false); }); },
    discharge: function (i) { var id = 'fire' + (i + 1); this.agent[id] = (this.agent[id] || 0) + 1; },
    random: function () { var d = DEF[Math.floor(Math.random() * DEF.length)]; this.set(d[0], true); return d[1]; }
  };

  if (FS.FlightModel) {
    var fmUpd = FS.FlightModel.prototype.update;
    FS.FlightModel.prototype.update = function (dt, o) {
      var R = FS.ProReplay;
      if (R && R.playing && R.fm === this) { R._apply(dt); return; }
      var A = F.active;
      if (A.brakes) { this.brakeCmd = 0; this.autoBrake = 'OFF'; if (this.pilot) { this.pilot.brakeL = this.pilot.brakeR = 0; } this.parkingBrake = false; }
      fmUpd.call(this, dt, o);
      var i, e;
      for (i = 0; i < 2; i++) {
        e = this.engines[i]; if (!e) continue;
        if (A['eng' + (i + 1)]) {
          if (e.state === 'running' || e.state === 'idle') e.commandShutdown();
          else if (e.state === 'starting') { e.state = 'off'; e.fuelOn = false; }
        }
        var fid = 'fire' + (i + 1);
        if (A[fid]) {
          e.fireWarning = true;
          if (e.state !== 'off') e.egt = Math.min(e.egt + dt * 6, 1100);
          if (e.state !== 'running' && e.state !== 'idle' && e.state !== 'starting' && (F.agent[fid] || 0) > 0) { F.set(fid, false); }
        }
      }
      if (A.gear && F.gearJam != null) { this.gearPos = F.gearJam; }
      if (A.flap && F.flapJam != null) { this.flapPos = F.flapJam; this.slatPos = F.slatJam; this.flapsMoving = false; }
      if (A.leak) this.fuelKg = Math.max(0, this.fuelKg - 1.3 * dt);
      // 座舱高度 (简化增压模型): 正常为航高 ~22% (最高 8000 ft), 失压时以 ~6000 ft/min 升向外界高度
      var altFt = isFinite(this.altFt) && this.altFt > 0 ? this.altFt : (this.pos ? this.pos.y : 0) * 3.28084;
      var tgt = A.press ? altFt : Math.min(8000, Math.max(0, altFt * 0.22));
      var rate = (A.press ? 6000 : 500) / 60 * dt;
      F.cabinAltFt += Math.max(-rate, Math.min(rate, tgt - F.cabinAltFt));
      this.cabinAltFt = F.cabinAltFt;
      var w = this.warnings; if (!w) return;
      var red = false, amber = false;
      DEF.forEach(function (d) { if (A[d[0]]) { if (d[4] >= 3) red = true; else amber = true; } });
      if (red && (!A.press || F.cabinAltFt > 9550)) w.masterWarning = true;
      if (amber) w.masterCaution = true;
    };
    var gs = FS.FlightModel.prototype.getState;
    FS.FlightModel.prototype.getState = function () {
      var st = gs.apply(this, arguments);
      if (F.active.ias && st) {
        var dAlt = ((this.pos ? this.pos.y : 0) - (F.altFrozen || 0)) * 3.28084;
        var v = Math.max(0, (F.iasFrozen || 0) + dAlt * 0.012);   // 皮托管+排水孔堵塞: 空速随高度变化 (像高度表)
        st.iasKt = v; if ('ias' in st) st.ias = v;
      }
      if (st) st.cabinAltFt = F.cabinAltFt;
      return st;
    };
  }
  if (FS.AircraftSystems) {
    var SP = FS.AircraftSystems.prototype, cmp = SP._compute, memo = SP._buildMemo;
    SP._compute = function (dt) {
      cmp.call(this, dt);
      var o = this.out, A = F.active, ch = false;
      if (!o || !o.hyd) return;
      for (var k = 0; k < 3; k++) if (A['hyd' + k] && o.hyd[k]) { o.hyd[k] = false; ch = true; }
      if (ch) {
        o.hydAny = o.hyd[0] || o.hyd[1] || o.hyd[2];
        o.gearHyd = o.hyd[0] || o.hyd[2] || (this.boeing && o.hyd[1]);
        o.flapHyd = o.hyd[0] || o.hyd[2] || (this.boeing && o.hyd[1]);
        this.fm.hydraulics = o.hyd.slice();
      }
    };
    SP._buildMemo = function () {
      var out = memo.call(this) || [], b = this.boeing, A = F.active, pre = [];
      DEF.forEach(function (d) {
        if (!A[d[0]]) return;
        if (d[0] === 'press' && F.cabinAltFt < 9550) { pre.push({ t: b ? 'CABIN ALT ' + Math.round(F.cabinAltFt) : 'CAB PR SYS FAULT', c: 'amber', level: 2 }); return; }
        pre.push({ t: b ? d[3] : d[2], c: d[4] >= 3 ? 'red' : 'amber', level: d[4] });
        if (d[0] === 'fire1' || d[0] === 'fire2') pre.push({ t: b ? '▶ FUEL CONTROL CUTOFF · FIRE HANDLE PULL/DISCH' : '▶ ENG MASTER OFF · AGENT 1 DISCH', c: 'cyan', level: 0 });
        if (d[0] === 'press') pre.push({ t: b ? '▶ OXYGEN MASKS ON · EMER DESCENT' : '▶ CREW OXY MASKS USE · EMER DESCENT', c: 'cyan', level: 0 });
      });
      return pre.concat(out);
    };
  }
  if (FS.Autopilot) {
    var eng = FS.Autopilot.prototype.engage, apu = FS.Autopilot.prototype.update;
    FS.Autopilot.prototype.engage = function () {
      if (F.active.ap) { if (FS.Bus) FS.Bus.emit('ap:engageRefused', { reason: 'AP FAULT' }); return false; }
      return eng.apply(this, arguments);
    };
    FS.Autopilot.prototype.update = function () {
      if (FS.ProReplay && FS.ProReplay.playing) return;
      if (F.active.ap && this.ap && this.ap.engaged) this.disengage('AP FAULT');
      return apu.apply(this, arguments);
    };
  }

  /* ---------------------------------------------------------------- 2. 回放 */
  var SKIP = { sys: 1, fms: 1, ap: 1, engines: 1, ac: 1, aero: 1, opts: 1, groundHeightFn: 1, flapData: 1 };
  function snap(fm) {
    var o = {};
    for (var k in fm) {
      if (!fm.hasOwnProperty(k) || SKIP[k]) continue;
      var v = fm[k], t = typeof v;
      if (t === 'number' || t === 'boolean' || t === 'string') o[k] = v;
      else if (v && t === 'object' && !Array.isArray(v) && Object.keys(v).length < 24 && Object.keys(v).every(function (x) { return typeof v[x] === 'number' || typeof v[x] === 'boolean'; })) o[k] = Object.assign({}, v);
      else if (Array.isArray(v) && v.length < 64 && v.every(function (x) { return typeof x === 'number' || typeof x === 'boolean'; })) o[k] = v.slice();
    }
    o.__eng = fm.engines.map(function (e) { var r = {}; for (var k in e) if (e.hasOwnProperty(k) && (typeof e[k] === 'number' || typeof e[k] === 'boolean' || typeof e[k] === 'string')) r[k] = e[k]; return r; });
    return o;
  }
  function restore(fm, o) {
    for (var k in o) {
      if (k === '__eng') continue;
      var v = o[k];
      if (v && typeof v === 'object' && fm[k] && typeof fm[k] === 'object') { if (Array.isArray(v)) { fm[k].length = 0; Array.prototype.push.apply(fm[k], v); } else Object.assign(fm[k], v); }
      else fm[k] = v;
    }
    (o.__eng || []).forEach(function (r, i) { if (fm.engines[i]) Object.assign(fm.engines[i], r); });
  }
  var LERP = ['n1', 'n2', 'egt', 'reverserPos'];
  var R = FS.ProReplay = { frames: [], hz: 10, maxS: 1800, playing: false, t: 0, speed: 1, fm: null, _acc: 0,
    rec: function (dt, fm) {
      if (this.playing) return;
      if (this.fm !== fm) { this.fm = fm; this.frames = []; this._acc = 0; this._t = 0; }
      this._t += dt; this._acc += dt;
      if (this._acc < 1 / this.hz) return; this._acc = 0;
      this.frames.push({ t: this._t, p: [fm.pos.x, fm.pos.y, fm.pos.z], q: [fm.q.x, fm.q.y, fm.q.z, fm.q.w], s: snapLite(fm) });
      if (this.frames.length > this.maxS * this.hz) this.frames.shift();
    },
    duration: function () { var f = this.frames; return f.length > 1 ? f[f.length - 1].t - f[0].t : 0; },
    start: function () {
      var s = sim(); if (!s || !s.fm || this.frames.length < 10) return false;
      this.fm = s.fm; this.saved = snap(s.fm); this.playing = true; this.paused = false; this.t = 0; this._prevCam = s.cameraRig && s.cameraRig.mode;
      if (FS.Bus) FS.Bus.emit('pro:replay', true); return true;
    },
    stop: function () {
      if (!this.playing) return; this.playing = false;
      restore(this.fm, this.saved); this.saved = null;
      var s = sim(); if (s && s.cameraRig && this._prevCam) s.cameraRig.setMode(this._prevCam);
      if (FS.Bus) FS.Bus.emit('pro:replay', false);
    },
    seek: function (frac) { this.t = Math.max(0, Math.min(1, frac)) * this.duration(); },
    _apply: function (dt) {
      var f = this.frames, n = f.length; if (n < 2) return;
      if (!this.paused) this.t = Math.min(this.duration(), this.t + dt * this.speed);
      if (this.t >= this.duration()) this.paused = true;
      var T = f[0].t + this.t, lo = 0, hi = n - 1;
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (f[m].t <= T) lo = m; else hi = m; }
      var a = f[lo], b = f[hi], u = b.t > a.t ? (T - a.t) / (b.t - a.t) : 0, fm = this.fm;
      fm.pos.x = a.p[0] + (b.p[0] - a.p[0]) * u; fm.pos.y = a.p[1] + (b.p[1] - a.p[1]) * u; fm.pos.z = a.p[2] + (b.p[2] - a.p[2]) * u;
      var d = a.q[0] * b.q[0] + a.q[1] * b.q[1] + a.q[2] * b.q[2] + a.q[3] * b.q[3], sg = d < 0 ? -1 : 1;
      var qx = a.q[0] + (sg * b.q[0] - a.q[0]) * u, qy = a.q[1] + (sg * b.q[1] - a.q[1]) * u, qz = a.q[2] + (sg * b.q[2] - a.q[2]) * u, qw = a.q[3] + (sg * b.q[3] - a.q[3]) * u;
      var L = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) || 1; fm.q.x = qx / L; fm.q.y = qy / L; fm.q.z = qz / L; fm.q.w = qw / L;
      var s = u < 0.5 ? a.s : b.s;
      for (var k in s) { if (k === 'e') continue; var va = a.s[k], vb = b.s[k]; fm[k] = (typeof va === 'number' && typeof vb === 'number') ? va + (vb - va) * u : s[k]; }
      if (s.e) s.e.forEach(function (r, i) { var e = fm.engines[i]; if (!e) return; LERP.forEach(function (x) { e[x] = a.s.e[i][x] + (b.s.e[i][x] - a.s.e[i][x]) * u; }); e.state = r.state; e.fireWarning = r.fire; });
    }
  };
  var LITE = ['gearPos', 'flapPos', 'slatPos', 'lat', 'lon', 'iasKt', 'tas', 'gs', 'mach', 'alpha', 'beta', 'onGround', 'fuelKg', 'gLoad', 'speedbrake', 'groundSpoilers', 'throttle'];
  function snapLite(fm) {
    var o = {}; LITE.forEach(function (k) { if (fm[k] !== undefined && typeof fm[k] !== 'object') o[k] = fm[k]; });
    o.e = fm.engines.map(function (e) { return { n1: e.n1, n2: e.n2, egt: e.egt, reverserPos: e.reverserPos, state: e.state, fire: e.fireWarning }; });
    return o;
  }
  if (FS.FlightModel) {
    var u2 = FS.FlightModel.prototype.update;
    FS.FlightModel.prototype.update = function (dt, o) { u2.call(this, dt, o); var s = sim(); if (s && s.fm === this) R.rec(dt, this); };
  }

  /* ---------------------------------------------------------------- 3. 天气 / METAR */
  var W = FS.ProWeather = {
    apply: function (p) {
      var s = sim(); if (!s || !s.env) return;
      var w = s.env.getWeather();
      for (var k in p) w[k] = p[k];
      if (p.cloudCover !== undefined || p.cloudBaseFt !== undefined) {
        var c = w.cloudCover, base = w.cloudBaseFt, type = c > 0.85 ? 'stratus' : (c > 0.5 ? 'stratocumulus' : 'cumulus');
        w.cloudLayers = c > 0.01 ? [{ cover: c, baseFt: base, topFt: base + (c > 0.7 ? 6000 : 3500), type: type }] : [];
        w.cloudTopFt = base + (c > 0.7 ? 6000 : 3500); w.ceilingFt = c >= 0.6 ? base : null;
      }
      s.env.setWeather(w);
    },
    /** 解析 METAR (足以覆盖风/阵风/能见度/云/天气现象/温度/QNH) */
    parseMetar: function (raw) {
      var t = (' ' + raw.toUpperCase() + ' ').replace(/\s+/g, ' '), m, w = { rain: 0, snow: 0, thunderstorm: false, fog: 0, haze: 0.1, turbulence: 0.08 };
      if ((m = t.match(/ (\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS) /))) {
        var f = m[4] === 'MPS' ? 1.944 : 1; w.windDirDeg = m[1] === 'VRB' ? 0 : +m[1]; w.windSpeedKt = Math.round(+m[2] * f); w.gustKt = m[3] ? Math.round(+m[3] * f) : w.windSpeedKt;
        w.turbulence = Math.min(0.9, 0.05 + (w.gustKt - w.windSpeedKt) * 0.03 + w.windSpeedKt * 0.008);
      }
      if (/ CAVOK /.test(t)) w.visibilityM = 10000 + 30000;
      else if ((m = t.match(/ (\d{4}) /))) w.visibilityM = +m[1] === 9999 ? 30000 : Math.max(50, +m[1]);
      else if ((m = t.match(/ (?:(\d+) )?(\d+)(?:\/(\d+))?SM /))) w.visibilityM = Math.round(((m[1] ? +m[1] : 0) + (m[3] ? +m[2] / +m[3] : +m[2])) * 1609);
      var cov = { FEW: 0.2, SCT: 0.4, BKN: 0.72, OVC: 1, VV: 1 }, best = 0, base = 5000, re = /(FEW|SCT|BKN|OVC|VV)(\d{3})/g;
      var ceil = null, low = null; while ((m = re.exec(t))) { var cv = cov[m[1]], bf = +m[2] * 100; if (low == null) low = bf; if (cv >= 0.72 && ceil == null) ceil = bf; if (cv > best) best = cv; } base = ceil != null ? ceil : (low != null ? low : base);
      if (/ (CAVOK|SKC|CLR|NSC|NCD) /.test(t)) best = 0.03;
      w.cloudCover = best; w.cloudBaseFt = Math.max(200, base);
      if (/ [+-]?[A-Z]*RA/.test(t) || / [+-]?[A-Z]*DZ/.test(t)) w.rain = / \+[A-Z]*RA/.test(t) ? 0.9 : (/ -[A-Z]*(RA|DZ)/.test(t) ? 0.3 : 0.6);
      if (/ [+-]?[A-Z]*SN/.test(t)) w.snow = / \+[A-Z]*SN/.test(t) ? 0.9 : 0.5;
      if (/TS/.test(t.replace(/TSNO/g, ''))) { w.thunderstorm = / [+-]?(VC)?TS/.test(t); }
      if (/ (FG|FZFG|BCFG|MIFG|PRFG) /.test(t)) w.fog = 0.6; else if (/ BR /.test(t)) { w.fog = 0.15; w.haze = 0.35; } else if (/ (HZ|FU|DU) /.test(t)) w.haze = 0.5;
      if ((m = t.match(/ (M?\d{2})\/(M?\d{2})? /))) w.temperatureC = +m[1].replace('M', '-');
      if ((m = t.match(/ Q(\d{4}) /))) w.qnhHpa = +m[1]; else if ((m = t.match(/ A(\d{4}) /))) w.qnhHpa = Math.round(+m[1] / 100 * 33.8639 * 10) / 10;
      return w;
    },
    /** 实时 METAR: aviationweather.gov 公开接口 (失败时返回 null, 由用户粘贴原文) */
    fetchMetar: function (icao) {
      var url = 'https://aviationweather.gov/api/data/metar?format=raw&ids=' + encodeURIComponent(icao);
      return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (t) { t = (t || '').trim().split('\n')[0]; if (!t) throw new Error('无数据'); return t; });
    }
  };

  /* ---------------------------------------------------------------- 4. Pro 面板 UI */
  var CSS = '#pro-panel{position:fixed;right:12px;top:52px;width:340px;max-height:calc(100vh - 120px);overflow:auto;z-index:60;background:rgba(10,18,32,.94);color:#e8eef7;border:1px solid #f5b82e55;border-radius:10px;font:13px/1.4 system-ui,sans-serif;padding:10px 12px;box-shadow:0 8px 30px #0008}' +
    '#pro-panel.hidden{display:none}#pro-panel h3{margin:4px 0 8px;font-size:14px;color:#f5b82e}#pro-panel .tabs{display:flex;gap:4px;margin-bottom:8px}#pro-panel .tabs button{flex:1}' +
    '#pro-panel button{background:#1c2a42;color:#e8eef7;border:1px solid #33476a;border-radius:6px;padding:4px 6px;cursor:pointer;font:inherit}#pro-panel button.on{background:#f5b82e;color:#111;border-color:#f5b82e}' +
    '#pro-panel label{display:flex;align-items:center;gap:6px;margin:3px 0}#pro-panel input[type=range]{flex:1}#pro-panel .row{display:flex;gap:6px;align-items:center;margin:4px 0}#pro-panel .muted{opacity:.7;font-size:12px}' +
    '#pro-panel .fl{display:grid;grid-template-columns:1fr auto;gap:3px 6px;align-items:center}#pro-panel .fl span.r{color:#ff6b6b}#pro-panel input[type=text]{flex:1;background:#0d1626;color:#fff;border:1px solid #33476a;border-radius:5px;padding:3px 6px}' +
    '#pro-replay-bar{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:61;background:rgba(10,18,32,.94);color:#fff;border:1px solid #f5b82e88;border-radius:10px;padding:6px 10px;display:flex;gap:6px;align-items:center;font:13px system-ui}#pro-replay-bar.hidden{display:none}#pro-replay-bar button{background:#1c2a42;color:#fff;border:1px solid #33476a;border-radius:6px;padding:3px 8px;cursor:pointer}#pro-replay-bar input{width:260px}';
  function slider(lbl, key, min, max, step, fmt) {
    var w = $('label', null, '<span style="width:92px">' + lbl + '</span>'), i = $('input', { type: 'range', min: min, max: max, step: step }), v = $('span', { style: 'width:56px;text-align:right' });
    w.appendChild(i); w.appendChild(v); i.dataset.key = key; i._fmt = fmt; return { el: w, input: i, val: v };
  }
  function build() {
    if (document.getElementById('pro-panel')) return;
    var st = $('style', null, CSS); document.head.appendChild(st);
    var P = $('div', { id: 'pro-panel', class: 'hidden' });
    P.innerHTML = '<h3>SkyRoute Pro · 专业功能</h3><div class="tabs"><button data-t="fail" class="on">故障</button><button data-t="wx">天气</button><button data-t="rp">回放</button></div>';
    var pages = {};
    ['fail', 'wx', 'rp'].forEach(function (t) { pages[t] = $('div', { 'data-p': t, style: t === 'fail' ? '' : 'display:none' }); P.appendChild(pages[t]); });
    P.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { P.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); Object.keys(pages).forEach(function (k) { pages[k].style.display = k === b.dataset.t ? '' : 'none'; }); if (b.dataset.t === 'wx') syncWx(); }; });
    // 故障
    var fl = $('div', { class: 'fl' });
    DEF.forEach(function (d) {
      var n = $('span', d[4] >= 3 ? { class: 'r' } : null, d[1]), b = $('button', { 'data-f': d[0] }, '触发');
      b.onclick = function () { F.set(d[0], !F.active[d[0]]); refreshF(); };
      fl.appendChild(n); fl.appendChild(b);
    });
    pages.fail.appendChild(fl);
    var r1 = $('div', { class: 'row' });
    var bR = $('button', null, '随机故障'), bC = $('button', null, '全部修复'), bD1 = $('button', null, '1 号灭火瓶'), bD2 = $('button', null, '2 号灭火瓶');
    bR.onclick = function () { F.random(); refreshF(); }; bC.onclick = function () { F.clearAll(); refreshF(); };
    bD1.onclick = function () { F.discharge(0); }; bD2.onclick = function () { F.discharge(1); };
    [bR, bC, bD1, bD2].forEach(function (b) { r1.appendChild(b); }); pages.fail.appendChild(r1);
    pages.fail.appendChild($('div', { class: 'muted' }, '故障按真实逻辑影响飞机: 发动机停车/推力丧失、液压丧失导致起落架与襟翼不能作动、空速随高度漂移、燃油持续减少、座舱高度上升等, 并在 ECAM / EICAS 上显示红色警告或琥珀色警戒。火警: 关闭发动机 (主电门 / 燃油切断) 后按灭火瓶即可扑灭。'));
    function refreshF() { fl.querySelectorAll('button').forEach(function (b) { var on = !!F.active[b.dataset.f]; b.classList.toggle('on', on); b.textContent = on ? '修复' : '触发'; }); }
    FS.Bus && FS.Bus.on && FS.Bus.on('pro:failure', refreshF);
    // 天气
    var S = [slider('风向', 'windDirDeg', 0, 359, 1, function (v) { return Math.round(v) + '°'; }), slider('风速', 'windSpeedKt', 0, 60, 1, function (v) { return Math.round(v) + ' kt'; }),
      slider('阵风', 'gustKt', 0, 80, 1, function (v) { return Math.round(v) + ' kt'; }), slider('颠簸', 'turbulence', 0, 1, 0.01, function (v) { return Math.round(v * 100) + '%'; }),
      slider('云量', 'cloudCover', 0, 1, 0.01, function (v) { return Math.round(v * 8) + '/8'; }), slider('云底', 'cloudBaseFt', 200, 15000, 100, function (v) { return Math.round(v) + ' ft'; }),
      slider('降雨', 'rain', 0, 1, 0.01, function (v) { return Math.round(v * 100) + '%'; }), slider('能见度', 'visibilityM', 100, 40000, 100, function (v) { return v >= 10000 ? (v / 1000).toFixed(0) + ' km' : Math.round(v) + ' m'; }),
      slider('雾', 'fog', 0, 1, 0.01, function (v) { return Math.round(v * 100) + '%'; })];
    S.forEach(function (s) {
      pages.wx.appendChild(s.el);
      s.input.oninput = function () { s.val.textContent = s.input._fmt(+s.input.value); var p = {}; p[s.input.dataset.key] = +s.input.value; W.apply(p); };
    });
    function syncWx() { var s = sim(); if (!s || !s.env) return; var w = s.env.getWeather(); S.forEach(function (x) { var v = w[x.input.dataset.key]; if (v == null) v = 0; x.input.value = v; x.val.textContent = x.input._fmt(+v); }); }
    var mr = $('div', { class: 'row' }), mi = $('input', { type: 'text', placeholder: 'ICAO 或 METAR 原文', id: 'pro-metar' }), mb = $('button', null, '实时 METAR'), ms = $('div', { class: 'muted' }, '可选: 从 aviationweather.gov 获取实时 METAR (需联网), 或直接粘贴 METAR 原文后点“应用”。');
    var ma = $('button', null, '应用');
    mr.appendChild(mi); mr.appendChild(mb); mr.appendChild(ma); pages.wx.appendChild(mr); pages.wx.appendChild(ms);
    function useMetar(raw) { var w = W.parseMetar(raw); W.apply(w); syncWx(); ms.textContent = '已应用: ' + raw; }
    ma.onclick = function () { var v = mi.value.trim(); if (v.length > 6) useMetar(v); };
    mb.onclick = function () {
      var s = sim(), icao = (mi.value.trim() || (s && s.hud && s.hud.selected && s.hud.selected.depIcao) || '').toUpperCase().slice(0, 4);
      if (!/^[A-Z0-9]{4}$/.test(icao)) { ms.textContent = '请输入 4 位 ICAO 代码'; return; }
      ms.textContent = '正在获取 ' + icao + ' …';
      W.fetchMetar(icao).then(useMetar).catch(function (e) { ms.textContent = '获取失败 (' + e.message + '), 可粘贴 METAR 原文'; });
    };
    // 回放
    pages.rp.innerHTML = '<div class="muted">自动记录最近 30 分钟飞行 (10 Hz)。回放时可在驾驶舱 / 追随 / 塔台 / 自由视角之间切换, 退出后恢复到回放前的状态继续飞行。</div>';
    var rr = $('div', { class: 'row' }), rb = $('button', null, '▶ 开始回放'), rl = $('span', { class: 'muted' });
    rr.appendChild(rb); rr.appendChild(rl); pages.rp.appendChild(rr);
    rb.onclick = function () { if (R.start()) { bar.classList.remove('hidden'); P.classList.add('hidden'); } else rl.textContent = '记录不足'; };
    setInterval(function () { if (!P.classList.contains('hidden')) rl.textContent = '已记录 ' + Math.round(R.duration()) + ' s'; }, 1000);
    document.body.appendChild(P);
    // 回放条
    var bar = $('div', { id: 'pro-replay-bar', class: 'hidden' });
    var pp = $('button', null, '⏸'), sl = $('input', { type: 'range', min: 0, max: 1000, value: 0 }), sp = $('button', null, '1×'), tt = $('span', null, '0:00');
    bar.appendChild($('b', { style: 'color:#f5b82e' }, '回放')); bar.appendChild(pp); bar.appendChild(sl); bar.appendChild(tt); bar.appendChild(sp);
    [['cockpit', '驾驶舱'], ['chase', '追随'], ['tower', '塔台'], ['free', '自由']].forEach(function (c) { var b = $('button', null, c[1]); b.onclick = function () { var s = sim(); s && s.cameraRig && s.cameraRig.setMode(c[0]); }; bar.appendChild(b); });
    var ex = $('button', { style: 'background:#7a2030' }, '退出'); bar.appendChild(ex);
    pp.onclick = function () { R.paused = !R.paused; if (!R.paused && R.t >= R.duration()) R.t = 0; };
    sp.onclick = function () { R.speed = R.speed >= 4 ? 0.5 : R.speed * 2; sp.textContent = R.speed + '×'; };
    sl.oninput = function () { R.seek(+sl.value / 1000); };
    ex.onclick = function () { R.stop(); bar.classList.add('hidden'); };
    setInterval(function () { if (!R.playing) return; var d = R.duration() || 1; if (document.activeElement !== sl) sl.value = Math.round(R.t / d * 1000); pp.textContent = R.paused ? '▶' : '⏸'; var s = Math.round(R.t); tt.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + ' / ' + Math.floor(d / 60) + ':' + ('0' + Math.round(d) % 60).slice(-2); }, 200);
    document.body.appendChild(bar);
    // 顶栏按钮
    var tb = document.querySelector('#topbar .tb-right');
    if (tb) { var pb = $('button', { id: 'pro-btn', class: 'tb-btn tb-wide', title: 'Pro: 故障 / 天气 / 回放 (P)', style: 'color:#f5b82e;font-weight:700' }, 'PRO'); pb.onclick = function () { P.classList.toggle('hidden'); }; tb.insertBefore(pb, tb.firstChild); }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  }
})(typeof window !== 'undefined' ? window : this);
