# FlightGear cockpit models used in SkyRoute Pro Beta

The 3D flight-deck interiors in SkyRoute Pro (`models/fg/fd_*.glb`) are converted from
GPL-licensed FlightGear aircraft from the official FGAddon repository
(https://svn.code.sf.net/p/flightgear/fgaddon/trunk/Aircraft/). They are distributed under the
GNU General Public License v2 (or later), see `LICENSE-GPL.txt`. Per-aircraft license and author
files are in `licenses/fg/`.

| SkyRoute types | FGAddon aircraft | Authors (from the aircraft's own files) |
|---|---|---|
| A320ceo, A320neo, A321neo (`fd_a320.glb`) | A320-family | © 2025 Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring, Thorsten Herrmann, Semir Gebran |
| B737-800, B737 MAX 8 (`fd_b737.glb`) | 737-800 | David Culp, Syd Adams, Innis Cunningham, Michael Soitanen |
| B777-300ER (`fd_b777.glb`) | 777 | Syd Adams, Justin Smithies, Karla, Thorsten Brehm, Joshua Davidson, Isaak Dieleman, Sidi Liang, Yongfan Li, Valkmjolnir, Lars Van Hattum and others (see AUTHORS) |
| B787-9 (`fd_b787.glb`) | 787-8 | Omega95, Redneck, Jentron, Scotth1, Bicyus, Awexome, Hooray, Zan, Nicky, Thorsten, Oliver T, Joshua W, Makoto Sakaguchi, Thomas Albrecht (radi) |

Modifications made by SkyRoute Pro: only the flight-deck parts were kept; geometry that can never be
seen from the pilot eye points (back faces and parts hidden behind panels) was removed; texels that no
visible triangle uses were filled with a flat colour; textures were cropped to their used area and
re-encoded losslessly (PNG / lossless WebP); geometry was compressed losslessly with
EXT_meshopt_compression. The conversion scripts are part of the Pro source archive.

Aircraft without a GPL FlightGear flight deck (A330, A350, C919, E190) use SkyRoute's own procedural cockpit.
FlightGear and FGAddon contributors do not endorse SkyRoute Pro.
