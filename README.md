# HỒI XƯA TAO... (Go To School)

Bố kể chuyện "hồi xưa tao đi học", bạn chơi lại câu chuyện đó. Mỗi lần đứa con chen vào nghi ngờ, **bố phóng đại và màn chơi biến đổi ngay trước mắt**: cầu gãy, nước lũ dâng, đèo mọc thêm, cọp xuất hiện. Trong lúc đó thằng Tuấn con bác Ba lúc nào cũng hơn bạn một bậc.

Side-scroller 2.5D ngắn (~2.5–3.5 phút), chạy trên web. Three.js + Vite + vanilla JS. Không có asset ngoài: mọi model dựng bằng primitive, âm thanh tổng hợp bằng WebAudio, chữ trên bảng vẽ bằng CanvasTexture. Font lấy từ Google Fonts (Be Vietnam Pro, Patrick Hand).

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # ra thư mục dist/
npm run preview    # thử bản build qua static server
```

`dist/` dùng đường dẫn tương đối (`base: './'`), nên chạy được từ thư mục con, itch.io hoặc GitHub Pages.

### Nộp lên itch.io
1. `npm run build`
2. Nén **nội dung** thư mục `dist/` (file `index.html` nằm ở gốc file zip).
3. Trên itch.io: Kind of project = HTML, upload zip, tick "This file will be played in the browser". Nên đặt khung 1280×720 và bật Fullscreen button.

### GitHub Pages
Đẩy nội dung `dist/` lên nhánh `gh-pages` (hoặc dùng action deploy Pages trỏ vào `dist/`).

## Điều khiển

| Phím | Hành động |
|---|---|
| `→` / `D` | Chạy tới |
| `←` / `A` | Lùi (chậm) |
| `Space` (hoặc `↑` / `W` ngoài suối) | Nhảy |
| `↑` / `W` (giữ, ở suối) | Giơ cặp lên đầu: đi chậm hơn nhưng cặp không ướt |
| `A` / `D` hoặc `←` / `→` (trên cầu khỉ) | Giữ thăng bằng (trên cầu nhân vật tự bước tới) |
| `Enter` / `Space` / click | Qua câu thoại |
| `M` | Tắt / bật âm |

Cảm ứng: nút ◀ ▶ (chạy / thăng bằng), ⤒ (nhảy), 🎒 (giơ cặp). Chạm màn hình để qua thoại. Nên xoay ngang.

## Cấu trúc

```
src/
  main.js            bootstrap, game loop, state machine (title → intro → game → ending → chọn nghề → credits)
  game.js            thế giới "hồi xưa": camera, trigger, đồng hồ, cặp khô, khúc gỗ, về đích
  config.js          TẤT CẢ hằng số gameplay (tốc độ, trọng lực, thời gian, độ khó...)
  state.js           GameState + lưu số lần chơi (localStorage, có try/catch)
  input.js           bàn phím + touch
  debug.js           autopilot để test (chỉ nạp khi bật debug)
  world/
    level.js         layout 5 đoạn, groundY(x), platform, checkpoint, danh sách TRIGGERS
    props.js         factory: createKid, createBuffalo, createBamboo, createMonkeyBridge, createTiger, createSchoolGate...
    transforms.js    các màn "phóng đại": cầu gãy, lũ dâng, đèo mọc, cọp (+ cutscene cởi dép)
    water.js         khối nước diorama, mực nước động
    sky.js           trời gradient + mặt trời mọc theo đồng hồ
    particles.js     bụi, nước bắn, khói
    livingroom.js    phòng khách hiện tại (intro/ending)
  entities/          player.js, tuan.js, tiger.js
  ui/                hud.js, dialogue.js, screens.js, style.css
  audio/sfx.js       synth: trống trường, gà gáy, loa phường, trâu, cọp, nhạc nền ngũ cung...
  data/script.js     TOÀN BỘ thoại + chữ UI (VI + EN). Sửa câu chữ ở đây, không cần đụng logic.
```

## Chỉnh nhanh

- **Độ khó / thời gian**: `src/config.js`. Ví dụ `REAL_SECONDS_FOR_RUN` (90 phút in-game = bao nhiêu giây thật), `RUN_SPEED`, `BALANCE_*`, `FLOOD_CURRENT`, `TIGER_SPEED`.
- **Thoại**: `src/data/script.js`. Câu mở đầu tự phóng đại thêm mỗi lần chơi lại (`INTRO_ESCALATION`).
- **Vị trí trigger / chướng ngại**: `LAYOUT` và `TRIGGERS` trong `src/world/level.js`.

Với autopilot chơi hoàn hảo thì tới trường lúc khoảng 6:40; chơi bình thường (lề mề, té vài lần) thì khoảng 6:50–7:00.

## Debug

Bật `DEBUG: true` trong `src/config.js` (hoặc thêm `?debug` vào URL):

- `1`–`5`: nhảy tới đầu đoạn tương ứng (các biến đổi trước đó được áp dụng luôn)
- `T`: tua đồng hồ +5 phút
- `G`: hiện / ẩn vạch trigger (đỏ) và checkpoint (xanh)
- Console: `await __quickstart()` để vào game, `await __run((g, p) => p.x > 300)` để autopilot chơi tới vị trí đó, `__run(() => false, 400, { lazy: 5, bag: false })` để thử nhánh lề mề / vở ướt.

## Ghi chú thiết kế

- Không có game over: té mương thì lóp ngóp rồi về checkpoint, bị trừ cặp khô và mất vài phút.
- Trên cầu khỉ, nhân vật tự bước tới để người chơi chỉ lo giữ thăng bằng (dễ hơn, chơi được trên cảm ứng).
- Thằng Tuấn không có AI: nó bám theo dây thun 8–12 đơn vị trước mặt bạn và **không bao giờ bị vượt**.
- Màn chọn nghề chỉ kết thúc được bằng Bác sĩ.
