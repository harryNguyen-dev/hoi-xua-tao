// TẤT CẢ hằng số gameplay nằm ở đây để chỉnh nhanh.
// All gameplay constants live here for quick tuning.

const queryDebug = typeof location !== 'undefined' && /[?&]debug/.test(location.search);

export const CONFIG = {
  // Debug: phím 1–5 nhảy tới đầu đoạn, T tua đồng hồ +5 phút, G hiện trigger.
  // Bật bằng cờ này (artifact host không truyền query) hoặc thêm ?debug vào URL.
  DEBUG: false || queryDebug,

  // ---- Đồng hồ in-game ----
  START_MINUTES: 5 * 60 + 30, // 5:30 sáng
  BELL_MINUTES: 7 * 60, // 7:00 trống đánh
  REAL_SECONDS_FOR_RUN: 150, // 90 phút in-game = 150 giây thật
  FALL_TIME_PENALTY_MIN: 3, // té mương / té cầu
  DITCH_TIME_PENALTY_MIN: 1, // té rãnh nhỏ ở ruộng
  TIGER_TIME_PENALTY_MIN: 2, // bị cọp vồ
  LOG_TIME_PENALTY_MIN: 1, // bị gỗ đụng

  // ---- Player ----
  RUN_SPEED: 6.4,
  BACK_SPEED: 3.0,
  ACCEL: 34,
  GRAVITY: 32,
  JUMP_VELOCITY: 11.5, // ~2.0 đơn vị chiều cao
  STEP_HEIGHT: 0.45, // bậc tối đa đi lên được mà không cần nhảy
  PLAYER_RADIUS: 0.3,
  PLAYER_HEIGHT: 1.5,
  COYOTE_TIME: 0.1,
  JUMP_BUFFER: 0.14,
  RESPAWN_DELAY: 0.8,

  // ---- Cặp khô ----
  BAG_START: 100,
  BAG_LOSS_CANAL: 25,
  BAG_LOSS_STREAM_PER_SEC: 8,
  BAG_LOSS_LOG: 15,
  BAG_LOSS_PASS_FALL: 10,
  BAG_LOSS_DITCH: 5,
  BAG_GOOD_THRESHOLD: 60,

  // ---- Cầu khỉ ----
  BRIDGE_WALK_SPEED: 3.5, // trên cầu tự bước tới, người chơi lo giữ thăng bằng
  BRIDGE_JUMP_SPEED: 7.0, // tốc độ tới khi nhảy trên cầu (qua chỗ gãy)
  BALANCE_DRIFT_MIN: 0.35,
  BALANCE_DRIFT_MAX: 0.95,
  BALANCE_BROKEN_MULT: 1.2, // tay vịn gãy -> khó hơn chút
  BALANCE_INSTABILITY: 0.8,
  BALANCE_CORRECT: 2.6,

  // ---- Suối ----
  WATER_SLOW: 0.6, // đi trong nước chậm 40%
  BAG_RAISED_SLOW: 0.8,
  FLOOD_CURRENT: 0.8, // dòng lũ đẩy lùi
  LOG_INTERVAL: 2.7,
  LOG_SPEED: 3.2,
  LOG_INVULN: 1.2,

  // ---- Đèo ----
  MUD_SLIDE_SPEED: 3.2,
  MUD_SLOW: 0.8,
  TIGER_SPEED: 5.0,
  TIGER_START_GAP: 11,
  TIGER_FOLLOW_GAP: 8.5,
  TIGER_STUN: 1.6,

  // ---- Thằng Tuấn ----
  TUAN_AHEAD_MIN: 8,
  TUAN_AHEAD_TARGET: 10,
  TUAN_AHEAD_MAX: 12.5,
  TUAN_SPEED: 6.0,
  TUAN_BOOST_SPEED: 14,
  TUAN_BUBBLE_SECONDS: 4.2,

  // ---- Camera ----
  CAM_FOV: 40,
  CAM_DISTANCE: 22,
  CAM_PITCH_DEG: 15,
  CAM_LERP: 4,
  CAM_MIN_VISIBLE_WIDTH: 22, // màn hình hẹp/dọc: lùi camera để vẫn thấy đủ rộng
  TRANSFORM_CAM_TWEEN: 1.2,

  // ---- Thoại ----
  TYPEWRITER_MS: 30,
  TYPE_SOUND: true,
  DIALOGUE_GUARD_MS: 250,

  // ---- Render ----
  SHADOW_MAP: 1024,
  MAX_PIXEL_RATIO: 2,
};
