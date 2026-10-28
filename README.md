<p align="center"><img src="assets/brand/skyroute_app_icon_512.png" alt="天际航线 SkyRoute Pro" width="160"></p>

# 天际航线 SkyRoute Pro Beta(仅娱乐,不喜勿喷)

> **SkyRoute Pro** 是 [天际航线 SkyRoute](https://github.com/kevinyuzekai/Flight-Simulator) 的独立 Pro 版本，在免费版基础上加入故障模拟、真实天气、多机位回放、航司涂装和来自 FlightGear 的 GPL 三维驾驶舱。Pro 版以 **GPL-2.0-or-later** 开源，存档与免费版分开（`srpro:` 前缀），两者可以同时安装。

**当前版本：Pro beta 0.1（0.1.0）**——**尚未发布**。安装包将于 **2026-11-11 00:00（北京时间）** 发布在本仓库的 [Releases](https://github.com/kevinyuzekai/SkyRoute-Pro/releases) 页面，届时再提供下载。

---

## 目录

- [Pro beta 0.1 功能](#pro-beta-01-功能)
- [下载](#下载)
- [已知限制](#已知限制)
- [许可与署名](#许可与署名)

## Pro beta 0.1 功能

- **故障模拟**：14 种故障——左/右发动机失效、发动机火警、三套液压系统失效、起落架卡滞、襟翼卡滞、空速不可靠（皮托管堵塞）、燃油泄漏、客舱失压、自动驾驶故障、刹车失效；空客显示 ECAM、波音显示 EICAS 告警。
- **天气**：天气面板，可选读取 **真实 METAR**（aviationweather.gov 公开接口，需联网；获取失败时可手动粘贴 METAR 原文），覆盖风 / 阵风 / 能见度 / 云 / 天气现象 / 温度 / QNH。
- **多机位回放**：飞行回放，可切换多个机位观看。
- **22 种航司涂装**：带涂装选择器。涂装为爱好者自制配色，与任何航空公司无关、未获其认可。
- **FlightGear GPL 三维驾驶舱**：A320ceo / A320neo / A321neo、737-800 / 737 MAX 8、777-300ER、787-9 使用由 FlightGear 机型转换来的驾驶舱（无损压缩后约 30.5 MB），主要操纵杆、FCU 与顶板点击区域已与模型对齐；A330、A350、C919、E190 使用 SkyRoute 自己的程序化驾驶舱。
- **全新图标**：Pro 版专用图标（`assets/brand/`）。
- **包含免费版 beta 0.6.1 的全部改进**：驾驶舱规格修正、E190 起落架、设备库、54 个机场、告警系统（`js/alerts.js`）、OSM 机场工具（`tools/osm-airports`）等。
- 关于页内附 GPL 许可、FlightGear 署名与源码提供声明。

## 下载

Pro beta 0.1 将于 **2026-11-11 00:00（北京时间）** 发布到 [Releases](https://github.com/kevinyuzekai/SkyRoute-Pro/releases)，计划包含：

- Windows 便携版 zip（基于系统 WebView2）
- 网页版 zip
- 完整对应源码 `SkyRoutePro-0.1.0-source.zip`（含 Windows 桌面外壳与驾驶舱转换脚本）

发布前 Releases 页面为空，属正常现象。

## 已知限制

- 737 / 787 的**顶板点击区域尚未与 FlightGear 模型完全对齐**。
- **A330 驾驶舱**仍是程序化驾驶舱（没有可用的 GPL FlightGear 驾驶舱，A350、C919、E190 同理）。
- **737 MAX 8** 目前只有一种（模型自带）涂装。
- **真实天气（METAR）需要联网**。
- Windows 安装包尚未在真机 Windows 上实测。

## 许可与署名

- **SkyRoute Pro Beta 以 GNU GPL v2 或（按你的选择）任何更高版本发布**，见 [`LICENSE-GPL.txt`](LICENSE-GPL.txt)（[`COPYING`](COPYING) 为同一份许可）。
- **FlightGear 署名**：`models/fg/fd_*.glb` 驾驶舱由 FGAddon 仓库（https://svn.code.sf.net/p/flightgear/fgaddon/trunk/Aircraft/）中的 GPL 机型 A320-family、737-800、777、787-8 转换而来，作者与修改说明见 [`CREDITS-FlightGear.md`](CREDITS-FlightGear.md)，各机型原始许可与作者文件在 `licenses/fg/`。FlightGear 与 FGAddon 贡献者不为 SkyRoute Pro 背书。
- **源码提供**：见 [`SOURCE-OFFER.md`](SOURCE-OFFER.md)。每个二进制发布都会附带完整对应源码 `SkyRoutePro-0.1.0-source.zip`。
- **第三方部分保留各自许可**（不属于 GPL）：three.js（MIT）、meshoptimizer 解码器（MIT）、外观机型模型（见 [`ASSETS_LICENSES.md`](ASSETS_LICENSES.md)）。
- 航司涂装为爱好者自制配色，与任何航空公司无关。
- 隐私说明见 [`PRIVACY.md`](PRIVACY.md)。
