// TOÀN BỘ thoại & chữ trong game (VI + EN). Sửa câu chữ ở đây, không cần đụng logic.
// speaker: 'BO' (Bố) | 'CON' (Con)

export const SPEAKERS = {
  BO: { name: 'BỐ', en: 'DAD', face: '👨', badge: '📰' },
  CON: { name: 'CON', en: 'KID', face: '🧒', badge: '📱' },
};

const B = (vi, en) => ({ speaker: 'BO', vi, en });
const C = (vi, en) => ({ speaker: 'CON', vi, en });

export const SCRIPT = {
  INTRO: [
    C('Mai đi học lười quá à... trường xa muốn xỉu.', "I don't wanna go to school tomorrow... it's sooo far."),
    B('Xa? Mày đi xe buýt 10 phút mà kêu xa?', 'Far? Your bus ride is 10 minutes!'),
    B('Hồi xưa tao đi học á hả...', 'Back in my day...'), // dòng này đổi theo số lần chơi (INTRO_ESCALATION)
    C('(lại nữa rồi...)', '(here we go again...)'), // dòng này đổi theo KID_REACTION
    B('5 giờ rưỡi sáng tao đã phải ra khỏi nhà. Gà còn chưa gáy!', 'I left home at 5:30 AM. Before the roosters even woke up!'),
  ],

  SEG1_START: [
    B('Tao đi qua cả cánh đồng, bờ ruộng thì nhỏ xíu.', 'I crossed whole rice fields on paths THIS narrow.'),
    B('Thằng Tuấn con bác Ba thì vừa đi vừa học thuộc bảng cửu chương.', "Tuấn, Uncle Ba's son, memorized multiplication tables while walking."),
  ],

  SEG2_MID: [
    B('Rồi tới cái cầu khỉ. Một cây tre thôi đó!', 'Then the monkey bridge. ONE bamboo pole!'),
    C('Cầu khỉ thì cũng có tay vịn mà bố.', 'Monkey bridges have handrails, dad.'),
    B('...Tay vịn GÃY! Mà khúc giữa cũng GÃY luôn!', '...The handrail was BROKEN! And the middle snapped too!'),
  ],

  SEG2_END: [B('Thằng Tuấn qua cầu mà còn dắt bà cụ qua giùm đó.', 'Tuấn crossed it while helping an old lady across.')],

  SEG3_START: [
    B('Tới suối thì phải cởi dép ra cầm. Dép mà trôi là đi chân đất cả năm.', "At the stream, you take off your sandals. Lose them and you're barefoot all year."),
  ],

  SEG3_MID: [
    C('Suối gì cạn xịt, tới mắt cá chân à.', "That stream's barely ankle-deep."),
    B('Đó là mùa khô! Mùa LŨ nước tới đây nè! (chỉ lên cổ)', "That's dry season! In FLOOD season it was up to HERE!"),
  ],

  SEG3_END: [
    B('Thằng Tuấn lội lũ mà còn cõng em gái nó nữa.', 'Tuấn waded the flood carrying his little sister.'),
    C('Thằng Tuấn này có thật không vậy bố?', 'Is this Tuấn guy even real?'),
    B('Thật! Giờ nó làm bác sĩ đó!', "Of course! He's a DOCTOR now!"),
  ],

  SEG4_MID_A: [
    B('Xong còn phải leo đèo.', 'Then you climb the mountain pass.'),
    C('Một cái đèo thôi mà.', "It's just one hill."),
    B('HAI cái!', 'TWO!'),
  ],

  SEG4_MID_B: [
    C('...Bố mới nói một cái mà.', '...You literally just said one.'),
    B('Mà trên đèo có CỌP!', 'And there were TIGERS!'),
  ],

  SEG4_END: [B('Thằng Tuấn leo đèo mà còn gánh củi về phụ mẹ nấu cơm.', 'Tuấn climbed it carrying firewood home for his mom.')],

  SEG5_START: [B('Tới trường là trống đánh liền. Trễ một phút là đứng ngoài cột cờ!', 'The drum hits at 7 sharp. One minute late and you stand by the flagpole!')],

  ENDING_ONTIME: [
    B('Đó, khổ vậy mà tao chưa trễ buổi nào.', 'See? All that and I was never late.'),
    B('Còn mày đi xe buýt mà tuần trước trễ 2 lần!', 'And you, on a BUS, were late twice last week!'),
  ],

  ENDING_LATE: [
    B('Hôm đó tao trễ vì... vì cọp! Mà vẫn bị phạt đứng cột cờ đó.', 'That day I was late because of... the tiger! Still got punished.'),
    B('Giờ mày sướng như tiên mà còn than!', "You've got it easy and you still complain!"),
  ],

  BAG_DRY: [B('Mà vở tao khô cong, chữ đẹp như in.', 'And my notebooks stayed bone dry, perfect handwriting.')],
  BAG_WET: [B('Vở ướt nhòe hết mà tao vẫn được 10 điểm!', 'My notebook got soaked and I STILL got a perfect 10!')],

  ENDING_COMMON: [
    C('Rồi thằng Tuấn sao bố?', 'So what about Tuấn?'),
    B('Nó tới trước tao. Như mọi ngày.', 'He got there before me. Like every day.'),
    B('Mà thôi. Lớn lên mày làm gì?', 'Anyway. What do you want to be when you grow up?'),
  ],
};

// Mỗi lần chơi lại, câu mở đầu phóng đại thêm một chút (index = số lần đã chơi xong).
export const INTRO_ESCALATION = [
  { vi: 'Hồi xưa tao đi học á hả...', en: 'Back in my day...' },
  { vi: 'Hồi xưa tao đi học... BA cái đèo!', en: 'Back in my day... THREE mountain passes!' },
  { vi: 'Hồi xưa tao đi học... BỐN cái đèo! Có cá sấu nữa!', en: 'Back in my day... FOUR passes! With crocodiles!' },
  { vi: 'Hồi xưa tao đi học... NĂM cái đèo, cọp, cá sấu, với... khủng long!', en: 'Back in my day... FIVE passes, tigers, crocodiles and... dinosaurs!' },
  { vi: 'Hồi xưa tao đi học... trên MẶT TRĂNG! Không có không khí luôn!', en: 'Back in my day... on the MOON! No oxygen at all!' },
];

export const KID_REACTION = [
  { vi: '(lại nữa rồi...)', en: '(here we go again...)' },
  { vi: '(lần trước bố nói có hai cái mà...)', en: '(last time it was two...)' },
  { vi: '(càng kể càng nhiều...)', en: '(it grows every time...)' },
  { vi: '(khủng long luôn hả bố...)', en: '(dinosaurs now, dad...?)' },
  { vi: '(...con đi ngủ đây.)', en: "(...I'm going to bed.)" },
];

// Bong bóng chữ của thằng Tuấn (không dừng game)
export const TUAN_BUBBLES = {
  SEG1: { vi: 'Bảy nhân tám bằng năm mươi sáu...', en: 'Seven times eight is fifty-six...' },
  SEG2: { vi: 'Bà đi cẩn thận nha bà', en: 'Careful now, grandma' },
  SEG3: { vi: 'Em ngồi yên nha', en: 'Sit still, sis' },
  SEG4: { vi: 'Củi này về con phụ mẹ nấu cơm', en: "This firewood's for mom's cooking" },
  SEG5: { vi: 'Cô ơi em lau bảng xong rồi', en: "Teacher, I've cleaned the board!" },
};

// Bong bóng nhỏ khác
export const BUBBLES = {
  buffalo: { vi: 'Ò... ò...', en: 'Moo...' },
  fall: { vi: 'Ối giời ơi!', en: 'Oh nooo!' },
  log: { vi: 'Á!', en: 'Ow!' },
  ditch: { vi: 'Ướt hết rồi!', en: 'Soaked!' },
  tigerRoar: { vi: 'GRÀOOO!', en: 'RAWRRR!' },
  tigerCatch: { vi: 'Bắt được rồi! ...giờ làm gì ta?', en: 'Got you! ...now what?' },
  tigerLeave: { vi: 'Thôi... mệt quá, về ngủ.', en: 'Nah... too tired. Nap time.' },
};

export const SEGMENT_NAMES = [
  { vi: 'Bờ ruộng', en: 'Rice paddy path' },
  { vi: 'Cầu khỉ', en: 'Monkey bridge' },
  { vi: 'Lội suối', en: 'Wading the stream' },
  { vi: 'Đèo đất đỏ', en: 'Red dirt pass' },
  { vi: 'Cổng trường', en: 'School gate' },
];

export const UI_TEXT = {
  title: 'HỒI XƯA TAO...',
  subtitle: 'Go To School',
  tagline: { vi: 'một câu chuyện có thật*', en: 'a true story*' },
  start: { vi: 'BẮT ĐẦU', en: 'START' },
  keys: [
    { k: '→ / D', vi: 'chạy', en: 'run' },
    { k: 'Space', vi: 'nhảy', en: 'jump' },
    { k: '↑ / W', vi: 'giơ cặp (ở suối)', en: 'lift bag (stream)' },
    { k: 'A / D', vi: 'thăng bằng (cầu khỉ)', en: 'balance (bridge)' },
    { k: 'Enter', vi: 'qua thoại', en: 'next line' },
    { k: 'M', vi: 'tắt tiếng', en: 'mute' },
  ],
  touchKeys: [
    { k: '◀ ▶', vi: 'chạy / thăng bằng', en: 'run / balance' },
    { k: '⤒', vi: 'nhảy', en: 'jump' },
    { k: '🎒', vi: 'giơ cặp (ở suối)', en: 'lift bag (stream)' },
    { k: 'Chạm', vi: 'qua thoại', en: 'tap for next line' },
  ],
  rotate: { vi: 'Xoay ngang điện thoại để chơi đã hơn', en: 'Rotate to landscape for the best view' },
  segmentLabel: 'ĐOẠN',
  clockSuffix: 'sáng',
  bagLabel: { vi: 'Cặp khô', en: 'Dry bag' },
  balanceLabel: { vi: 'Giữ thăng bằng', en: 'Balance' },
  muted: { vi: 'Đã tắt tiếng', en: 'Muted' },
  unmuted: { vi: 'Đã bật tiếng', en: 'Sound on' },
  hints: {
    start: { vi: '→ / D: chạy  ·  Space: nhảy qua rãnh nước', en: '→ / D to run  ·  Space to jump the ditches' },
    buffalo: { vi: 'Trâu chắn đường! Nhảy lên lưng trâu (Space)', en: 'Buffalo in the way! Jump on its back (Space)' },
    bridge: { vi: 'A / D (hoặc ← →): giữ thăng bằng  ·  Space: nhảy', en: 'A / D (or ← →) to balance  ·  Space to jump' },
    gap: { vi: 'Cầu gãy! Bấm Space để nhảy qua!', en: 'Broken bridge! Press Space to jump!' },
    flood: { vi: 'Giữ ↑ / W để giơ cặp lên đầu  ·  Space: nhảy né khúc gỗ', en: 'Hold ↑ / W to lift your bag  ·  Space to jump the logs' },
    mud: { vi: 'Bùn trơn! Giữ → không là trượt xuống', en: 'Slippery mud! Keep holding → or you slide' },
    tiger: { vi: 'CỌP! CHẠY ĐI!!!', en: 'TIGER! RUN!!!' },
    school: { vi: 'Chạy nước rút tới cổng trường!', en: 'Sprint to the school gate!' },
  },
  banners: {
    late: { vi: 'TRỄ RỒI!', en: 'LATE!' },
    onTime: { vi: 'KỊP GIỜ!', en: 'MADE IT!' },
    arrivedLate: { vi: 'TỚI TRƯỜNG... MÀ TRỄ', en: 'MADE IT... LATE' },
  },
  transitions: {
    intro: { vi: 'HỒI XƯA...', en: 'Back in my day...' },
    ending: { vi: '...chuyện là vậy đó.', en: '...and that is how it went.' },
  },
};

export const CAREER = {
  title: { vi: 'LỚN LÊN CON MUỐN LÀM GÌ?', en: 'WHAT DO YOU WANT TO BE?' },
  prompt: { vi: 'Chọn đi con. Bố không ép.', en: "Go on, pick. No pressure." },
  buttons: {
    doctor: { icon: '👨‍⚕️', vi: 'Bác sĩ', en: 'Doctor' },
    police: { icon: '👮', vi: 'Công an', en: 'Police' },
    painter: { icon: '🎨', vi: 'Họa sĩ', en: 'Artist' },
    gamedev: { icon: '🎮', vi: 'Làm game', en: 'Game dev' },
  },
  lines: {
    painter: { vi: 'Vẽ vời thì ăn gì con?', en: 'How will drawing feed you?' },
    painterFlee: { vi: 'Thấy chưa, nghề đó nó còn né mày.', en: 'See? Even that job is avoiding you.' },
    gamedev: { vi: 'Làm game có ra tiền không con?', en: 'Does making games even pay?' },
    police: { vi: 'Ừ, không làm bác sĩ được thì làm công an cũng được.', en: "Fine, police works if doctor doesn't." },
    doctor: { vi: 'Ngoan! Giỏi như thằng Tuấn!', en: 'Good kid! Just like Tuấn!' },
  },
};

export const CREDITS = {
  title: 'HỒI XƯA TAO...',
  lines: [
    { vi: 'Dựa trên câu chuyện có thật*', en: 'Based on a true story*' },
    { vi: '*được phóng đại mỗi năm một chút', en: '*exaggerated a little more every year', small: true },
    { vi: 'Thân tặng mọi bố mẹ Việt Nam và mọi đứa con đã nghe chuyện này 1000 lần.', en: 'For every Vietnamese parent, and every kid who has heard this story 1000 times.' },
  ],
  stats: {
    arrive: { vi: 'Giờ tới trường', en: 'Arrival time' },
    bag: { vi: 'Cặp khô', en: 'Dry bag' },
    falls: { vi: 'Số lần té', en: 'Falls' },
    plays: { vi: 'Số lần nghe bố kể', en: 'Times you heard this story' },
    tuan: { vi: 'Thằng Tuấn: vẫn hơn bạn.', en: 'Tuấn: still better than you.' },
  },
  replay: { vi: 'Chơi lại', en: 'Play again' },
  retell: { vi: 'Nghe bố kể lần nữa', en: 'Hear dad tell it again' },
};
