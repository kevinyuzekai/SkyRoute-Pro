# SkyRoute Pro Beta 0.1 — progress (updated 2026-10-28 01:4x UTC+8)

## Done
1. v4 icon: Tauri icons, 40 MSIX assets, favicon, in-app brand (free app untouched)
2. Cockpit shrink, lossless: 34.48 MB -> ~30.5 MB (A320 15.16, 737 1.98, 777 8.98, 787 4.40 MB)
3. Hitbox alignment: named levers snapped to FG nodes; overhead uses a uniform similarity map (the old affine map caused fuel-l1/fuel-c overlaps, now fixed); FCU fitted. 737/787 overhead not fitted (too few anchors)
4. localStorage shim (srpro:), Store search links
5. Failures (fire now clears once the engine is no longer running), ECAM/EICAS, weather/METAR, replay
6. 22 airline liveries + picker + fan-made note; GPL/credits/source offer + About
7. dev061 0.6.1 merged (3-way, base dev060): cockpit spec fix, E190 gear, device library, 54 airports, alerts.js, tools/osm-airports. Only conflict was config.js version (kept 0.1.0-beta pro)
8. Tests: unit 94/94, device-library OK; e2e 35/36 after merge. The one failure was a test bug (no AP, so the aircraft dives while paused): the press test now holds altitude, verified standalone OK
9. Prep: build-app.sh includes GPL files; Cargo.lock root version 0.1.0; rel-pro-0.1/make-release.sh written

## Remaining
- Full e2e re-run (expect 36/36)
- build-app.sh -> cargo xwin build (use PATH=$HOME/.cargo/bin:$PATH, rustc 1.99.1; system 1.85 fails) --locked --offline
- rel-pro-0.1/make-release.sh (MSIX, portable, web, source zip, SHA256SUMS) + notes.md
- Stop http.server :8731
- e2e 36/36 (2026-10-28); server stopped; building
- DONE: rel-pro-0.1 built (see notes.md)
