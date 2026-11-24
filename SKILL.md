---
name: film-pilgrimage
description: Make a social-media-style vertical (1080×1920) film-pilgrimage video in Remotion — "film still vs. my photo" comparisons at each filming location, an animated walking-route map, scenery montage, route card, music aligned to cuts, and a 3:4 feed cover. Use when someone wants to turn trip photos of movie filming locations (电影取景地巡礼 / 打卡 / 对比图) into a video, or continue / add a film to an existing pilgrimage project.
---

# 电影取景地巡礼视频

把「电影原片 vs 我拍的实景」做成社交媒体风格的竖屏视频。引擎是一个现成的 Remotion 项目（`template/`），每部新片只需要：**一份 JSON 数据 + 一套风格 + 素材**，封面和开场再按片单独设计。

做过的例子：《爱在黎明破晓前》（维也纳，两天，深色胶片风、黑胶开场）已经注册在 `template/` 里，带照片，可以直接渲染（没有音乐）；《音乐之声》（萨尔茨堡，纸色卷轴风，两段音乐对齐）只有 JSON，在 `template/examples/`。

## 开始之前

1. 用户说中文就用中文回复。地名用当地语言原名，括号或旁边给中文。
2. 先问清楚、不要猜：
   - 哪部电影，哪座城市，去了几天，每天实际走的顺序。
   - 对比图（上半原片、下半实景，拼在一张图里）在哪个文件夹。
   - 有没有行程笔记（md）。有就以它为准查地名、营业时间、途经地点。
   - 风景照（蒙太奇用）、想用的音乐。
3. 检查环境：`node -v`（需要 20+）。

## 新建项目

```bash
cp -R "<本 skill 目录>/template" "<用户选的位置>/pilgrimage"
cd "<…>/pilgrimage" && npm i
```

已经有项目（用户以前做过）就直接在那个项目里加新片，不要再复制一份。

## 加一部新片

1. **素材**：对比图、风景照改成英文短名，复制到 `public/raw/<film-id>/`；音乐放 `public/music/`。用 `npm run check-images` 或 sharp 读出每张图的宽高。
2. **数据** `src/data/<film-id>.json`：照 `examples/before-sunrise.json` 的结构写，字段含义见 `src/types.ts` 的注释。然后在 `src/data/index.ts` 里注册。要点：
   - `locations` 按**实际走的顺序**排（`day` + `order`），不是按电影剧情。
   - `splitRatio` = 原片在拼图里占的高度比例。
   - `camera`：照片没 GPS 就用地标坐标估计，标 `source: "estimated"`。
   - 中间去了别处：`detour: true`，`walkNoteZh` 只写路上真正经过的地方。
   - 营业时间等实用信息写 `tipZh`。**所有事实先查证、再和用户确认。**
3. **风格** `src/theme.ts`：在 `THEMES` 里加一项，复制最接近的一套改：
   - `skin`：`filmstrip`（胶片，叠化）或 `scroll`（卷轴展开）。
   - `opening`：`vinyl`（点黑胶开场）或 `none`。
   - `sceneMark`：`quote` →「台词」，`note` → ♪ 歌名。
   - `scriptFont`、颜色、调色 `grade`、节奏 `timing`（有固定 BPM 的歌可以设 `bpm` 卡拍）。
4. **封面**：没单独设计的片会自动用 `GenericCover`（全图 + 左侧标题）。要做精致的版本，就在 `src/components/Cover.tsx` 里写一个组件，加进 `COVERS`。
5. Composition 会自动生成：`<FilmId 的驼峰写法>`（如 `BeforeSunrise`）、多天时每天一个 `…Day1`，以及 `Cover-<film-id>`。

## 视频结构（引擎已实现）

封面开场 → 全程路线图 → 每站（步行卡 + 小地图 → 原片 → 揭开实景 → 上下分开 → 停留）→ 最后一站后的风景 → [结尾] → 路线卡 → 蒙太奇 → [彩蛋] → 淡出到黑。

可选段落都由 JSON 控制：`start.photo`（住处，放开头或结尾）、`montage`（`at: afterLocations / bonus`，可分章节、可纵向平移长图）、`finale`、`easterEgg`、`music`（把歌里某一秒对齐到某个段落开头，可在某段降低音量）。

## 检查和导出

```bash
npx tsc --noEmit
npx remotion render <Id> out/preview.mp4 --gl=angle --scale=0.4 --bundle-cache=false     # 低清预览
npx remotion render <Id> out/<film>-final.mp4 --gl=angle --bundle-cache=false --crf=18 --audio-bitrate=320k
npx remotion still Cover-<film-id> out/covers/<film>-cover.png --bundle-cache=false         # 3:4 封面
```

- 每隔约 1 秒抽一帧拼成一张图，逐张看。音频用能量曲线确认开头、降低音量和结尾淡出的时间点。
- 给用户看之前自己先看过；改完以命令行渲染结果为准（Studio 开久了热更新会卡）。

## 默认设计规则（可以按用户喜好改，但先照这个做）

- 每组对比最后，**原片和实景都要留在画面上**；任何图都**不能从下往上冒出来**。
- 封面左对齐、有层次，只有一个主标题（中文为主，英文斜体约 0.6 倍）。不要居中大字，不要裁掉用户选的照片。
- 蒙太奇只用新照片，全屏，不加模糊背景，每张时间短。
- 「途经」只写真正路过的地方；不编地名、不编营业时间。
- 平台界面安全区：顶部约 110px、底部约 104px 会被界面遮住，不放字。

更多踩过的坑（地图、曲线、渲染缓存、ffmpeg 限制等）见 [lessons.md](lessons.md)。动手改地图、时间线、对比段落之前先读一遍。

## 不在模板里的东西

模板不含音乐（版权）。新建项目后，如果用户不需要《爱在》示例，把它从 `src/data/index.ts` 里去掉，删掉 `public/raw/before-sunrise` 和 `public/raw/vienna`、`public/raw/sisi`。每部片的封面、开场、结尾、彩蛋都应该按这部片的调性重新设计，模板里的两部只是参考。
