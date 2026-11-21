// Ngôn ngữ hiển thị: 'vi' hoặc 'en' (một ngôn ngữ, không song ngữ). Lưu lại cho lần sau.
const KEY = 'hoixuatao_lang';
export const LANGS = ['vi', 'en'];

let lang = 'vi';
try {
  const saved = localStorage.getItem(KEY);
  if (LANGS.includes(saved)) lang = saved;
} catch {
  /* private mode */
}

export function getLang() {
  return lang;
}

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  document.documentElement.lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* bỏ qua */
  }
}

/** Lấy chữ theo ngôn ngữ hiện tại từ object {vi, en} (chuỗi thường thì trả nguyên). */
export function t(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return o[lang] ?? o.vi ?? '';
}

document.documentElement.lang = lang;
