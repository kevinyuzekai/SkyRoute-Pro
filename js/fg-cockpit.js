/* SkyRoute Pro — FlightGear 驾驶舱内饰 (GPL-2.0, 见 LICENSE-GPL.txt / CREDITS-FlightGear.md)
   有 FlightGear 驾驶舱的机型: 运行时加载 models/fg/fd_*.glb (无损: EXT_meshopt_compression 无量化 + WebP/PNG 无损),
   替换程序化舱壁/面板外观; 程序化的可点控件保留为隐形点击区, 显示器 (PFD/ND/ECAM/EICAS) 移到 FG 模型的屏幕位置。
   没有 FG 驾驶舱的机型 (A330/A350/C919/E190) 继续使用程序化驾驶舱。 */
(function (global) {
  'use strict';
  var FS = global.FS = global.FS || {};
  var MAP = { 'A320ceo': 'a320', 'A320neo': 'a320', 'A321neo': 'a320', 'B737-800': 'b737', 'B737-MAX8': 'b737', 'B777-300ER': 'b777', 'B787-9': 'b787' };
  var SCREEN_SRC = { b787: { ndL: 'mfdL', ndR: 'mfdR2', lower: 'mfdR' } };
  var cache = {};

  function parseGLB(buf) {
    var dv = new DataView(buf), jl = dv.getUint32(12, true);
    var json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    var bo = 20 + jl + 8, bl = dv.getUint32(20 + jl, true);
    return { g: json, bin: new Uint8Array(buf, bo, bl) };
  }
  function load(key) {
    if (cache[key]) return cache[key];
    var D = global.MeshoptDecoder;
    cache[key] = global.fetch('models/fg/fd_' + key + '.glb').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (buf) { return D.ready.then(function () { return buf; }); })
      .then(function (buf) {
        var P = parseGLB(buf), g = P.g, bin = P.bin, views = [];
        g.bufferViews.forEach(function (bv) {
          var ext = bv.extensions && bv.extensions.EXT_meshopt_compression;
          if (ext) {
            var out = new Uint8Array(ext.count * ext.byteStride);
            D.decodeGltfBuffer(out, ext.count, ext.byteStride, bin.subarray(ext.byteOffset, ext.byteOffset + ext.byteLength), ext.mode, ext.filter || 'NONE');
            views.push(out);
          } else views.push(bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength));
        });
        function acc(i) {
          var a = g.accessors[i], v = views[a.bufferView], n = a.count * ({ VEC3: 3, VEC2: 2, SCALAR: 1 })[a.type];
          var C = a.componentType === 5126 ? Float32Array : (a.componentType === 5125 ? Uint32Array : Uint16Array);
          return new C(v.buffer.slice(v.byteOffset, v.byteOffset + n * C.BYTES_PER_ELEMENT));
        }
        var imgs = (g.images || []).map(function (im) {
          var blob = new global.Blob([views[im.bufferView]], { type: im.mimeType });
          return global.createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none' });
        });
        return Promise.all(imgs).then(function (bitmaps) {
          return { g: g, acc: acc, bitmaps: bitmaps, extras: g.nodes[0].extras || {} };
        });
      });
    return cache[key];
  }

  function applyTo(cp, data) {
    var THREE = cp.THREE, g = data.g, ex = data.extras, key = cp._fgKey;
    if (!cp.group || cp._disposed) return;
    var root = new THREE.Group(); root.name = 'fg-cockpit';
    var eye = ex.eye || [0, 0, 0];
    root.position.set(cp.eyeX - eye[0], -eye[1], -eye[2]);
    var texs = data.bitmaps.map(function (bm) {
      var t = new THREE.Texture(bm); t.flipY = false; if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; cp._texs.push(t); return t;
    });
    g.meshes[0].primitives.forEach(function (p) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(data.acc(p.attributes.POSITION), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(data.acc(p.attributes.NORMAL), 3));
      if (p.attributes.TEXCOORD_0 != null) geo.setAttribute('uv', new THREE.BufferAttribute(data.acc(p.attributes.TEXCOORD_0), 2));
      geo.setIndex(new THREE.BufferAttribute(data.acc(p.indices), 1));
      var m = g.materials[p.material], pbr = m.pbrMetallicRoughness || {}, cf = pbr.baseColorFactor || [1, 1, 1, 1];
      var ti = pbr.baseColorTexture ? pbr.baseColorTexture.index : null, src = ti != null ? (g.textures[ti].extensions ? g.textures[ti].extensions.EXT_texture_webp.source : g.textures[ti].source) : null;
      var col = new THREE.Color(cf[0], cf[1], cf[2]);
      var mat = new THREE.MeshBasicMaterial({ color: col, map: src != null ? texs[src] : null, side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        transparent: m.alphaMode === 'BLEND', opacity: cf[3], fog: false });
      if (mat.transparent) mat.depthWrite = false;
      mat.userData.base = col.clone(); mat.userData.emissive = !!m.emissiveFactor; mat.userData.integ = false;
      if (!m.emissiveFactor && !mat.transparent) cp._litify(mat, 0.8, 0);
      cp._mats.push(mat); cp._geoms.push(geo);
      var mesh = new THREE.Mesh(geo, mat); mesh.userData.noBake = true; mesh.matrixAutoUpdate = false;
      root.add(mesh);
    });
    root.updateMatrixWorld(true);
    // 隐藏程序化外观 (保留显示器 + 隐形点击区)
    var keep = new Set();
    Object.keys(cp.screens || {}).forEach(function (k) { if (cp.screens[k]) keep.add(cp.screens[k]); });
    cp.group.traverse(function (o) {
      if (!o.isMesh || keep.has(o)) return;
      if (o.material && o.material === cp._hitMat) return;
      o.visible = false;
    });
    // 显示器移到 FG 屏幕位置
    var S = ex.screens || {}, alias = SCREEN_SRC[key] || {};
    Object.keys(cp.screens || {}).forEach(function (k) {
      var mesh = cp.screens[k]; if (!mesh) return;
      var q = S[alias[k] || k];
      if (!q) { mesh.visible = false; return; }
      var V = q.map(function (c) { return new THREE.Vector3(c[0], c[1], c[2]).add(root.position); });
      var a = V[1].clone().sub(V[0]), b = V[3].clone().sub(V[0]);
      var hx = Math.abs(a.x) >= Math.abs(b.x) ? a : b, vy = hx === a ? b : a;
      if (hx.x < 0) hx.negate(); if (vy.y < 0) vy.negate();
      var c = V[0].clone().add(V[1]).add(V[2]).add(V[3]).multiplyScalar(0.25);
      var n = new THREE.Vector3().crossVectors(hx, vy).normalize();
      c.addScaledVector(n, 0.0025);
      var gp = mesh.geometry.parameters || { width: 1, height: 1 };
      var mtx = new THREE.Matrix4().makeBasis(hx.clone().normalize(), vy.clone().normalize(), n);
      mesh.parent && mesh.parent.remove(mesh); cp.group.add(mesh);
      mesh.position.copy(c); mesh.quaternion.setFromRotationMatrix(mtx);
      mesh.scale.set(hx.length() / (gp.width || 1), vy.length() / (gp.height || 1), 1);
      mesh.visible = true;
    });
    alignHits(cp, ex.hit, root.position);
    cp.group.add(root);
    cp.fg = { key: key, root: root, tris: g.accessors.filter(function (x) { return x.type === 'SCALAR'; }).reduce(function (s, x) { return s + x.count / 3; }, 0) };
    if (FS.Bus) FS.Bus.emit('cockpit:fg', { key: key });
  }

  /* 点击区对齐 FG 机模: 1) 按 FG 节点名逐个吸附关键操纵件; 2) 头顶板点击区按 FG 按钮包围盒做等比相似变换; 3) FCU/MCP 面板移到 FG 旋钮区 */
  function alignHits(cp, H, off) {
    if (!H || window.__noAlign) return;
    var THREE = cp.THREE, V = function (p) { return new THREE.Vector3(p[0], p[1], p[2]).add(off); };
    cp.group.updateMatrixWorld(true);
    function posIn(o) { return cp.group.worldToLocal(o.getWorldPosition(new THREE.Vector3())); }
    function moveTo(o, t) { var w = cp.group.localToWorld(t.clone()); o.parent.worldToLocal(w); o.position.copy(w); o.updateMatrixWorld(true); }
    var done = new Set(), n = 0;
    Object.keys(H.named || {}).forEach(function (id) {
      var e = cp.ctlById[id]; if (!e || !e.mesh || id === 'speedbrake') return;
      moveTo(e.mesh, V(H.named[id])); done.add(e.mesh); n++;
    });
    var btn = (H.ovhBtn || []).map(V);
    if (btn.length >= 20) {
      var hb = cp.clickables.filter(function (o) { return o.material === cp._hitMat && !done.has(o) && posIn(o).y > 0.3; });
      var bb = function (arr) { var b = new THREE.Box3(); arr.forEach(function (p) { b.expandByPoint(p); }); return b; };
      var P = hb.map(posIn), b0 = bb(P), b1 = bb(btn), s0 = b0.getSize(new THREE.Vector3()), s1 = b1.getSize(new THREE.Vector3());
      var used = {}, ks = ['x', 'y', 'z'].map(function (a) { return s0[a] > 1e-4 ? s1[a] / s0[a] : 1; }).sort(function (a, b) { return a - b; }), k = Math.min(1, ks[0]), c0 = b0.getCenter(new THREE.Vector3()), c1 = b1.getCenter(new THREE.Vector3());
      hb.forEach(function (o, i) {
        var t = new THREE.Vector3();
        t.copy(P[i]).sub(c0).multiplyScalar(k).add(c1); // 相似变换 (等比缩放), 保持面板倾角, 避免点击区互相遮挡
        var best = -1, bd = 0;
        btn.forEach(function (q, j) { if (used[j]) return; var d = q.distanceTo(t); if (d < bd) { bd = d; best = j; } });
        if (best >= 0) used[best] = 1;
        moveTo(o, best >= 0 ? btn[best] : t); o.scale.multiplyScalar(k); n++;
      });
    }
    var fc = (H.fcu || []).map(V);
    if (fc.length >= 3 && cp.fcuMesh) {
      var b = new THREE.Box3(); fc.forEach(function (p) { b.expandByPoint(p); });
      var c = b.getCenter(new THREE.Vector3()), w = b.max.x - b.min.x, gp = cp.fcuMesh.geometry.parameters || {};
      moveTo(cp.fcuMesh, c);
      if (gp.width && w > 0.05) { var k = (w * 1.2) / (gp.width * cp.fcuMesh.getWorldScale(new THREE.Vector3()).x); cp.fcuMesh.scale.multiplyScalar(k); }
      n++;
    }
    cp.fgHitsAligned = n;
  }

  if (FS.Cockpit3D) {
    var build = FS.Cockpit3D.prototype._build;
    FS.Cockpit3D.prototype._build = function () {
      build.apply(this, arguments);
      var key = MAP[this.typeKey], self = this;
      var off = false; try { off = global.localStorage.getItem('pro.fgCockpit') === '0' || /[?&]fgcockpit=0\b/.test(global.location.search); } catch (e) { /* */ }
      if (!key || off || !global.fetch || !global.MeshoptDecoder || !global.createImageBitmap) return;
      this._fgKey = key;
      this.fgReady = load(key).then(function (d) { applyTo(self, d); return true; })
        .catch(function (e) { FS.Log && FS.Log.warn('FG 驾驶舱加载失败, 使用程序化驾驶舱: ' + (e && e.message)); return false; });
    };
  }
  FS.FGCockpit = { map: MAP, load: load };
})(typeof window !== 'undefined' ? window : this);
