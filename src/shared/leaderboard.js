// Bảng xếp hạng cục bộ (TICKET-04 mục 3). Logic thuần, dùng chung cho server Node, web và test.
// Không đụng tới luật game và đầu ra headless.
export const LEADERBOARD_MAX = 10;

// Tên 3–12 ký tự [A-Za-z0-9_]; điểm cộng: nhận thêm chữ Latin có dấu tiếng Việt (ă â đ ê ô ơ ư + dấu thanh) (A4-7).
// Đếm theo ký tự sau khi chuẩn hóa NFC, nên "Mây" = 3 ký tự dù gõ dạng tổ hợp.
const NAME_RE = /^[\p{Script=Latin}0-9_]{3,12}$/u;
export function normalizeName(name) {
  return typeof name === 'string' ? name.normalize('NFC').trim() : name;
}
/** Trả về chuỗi lỗi (tiếng Việt) hoặc null nếu tên hợp lệ. */
export function nameError(name) {
  const n = normalizeName(name);
  if (typeof n !== 'string') return 'Tên phải là chuỗi';
  const len = [...n].length;
  if (len < 3 || len > 12) return 'Tên cần 3–12 ký tự';
  if (!NAME_RE.test(n)) return 'Tên chỉ gồm chữ cái (có thể có dấu), số và _';
  return null;
}

// ISO 8601 có múi giờ: Z hoặc ±hh:mm
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;
const isInt = (v) => Number.isInteger(v);

/** Kiểm một mục; trả về lỗi hoặc null. */
export function entryError(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return 'Mục phải là object';
  const ne = nameError(e.name);
  if (ne) return ne;
  if (!isInt(e.score) || e.score < 0) return 'score phải là số nguyên ≥ 0';
  if (!isInt(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) return 'nights_won phải là 0–3';
  if (typeof e.achieved_at !== 'string' || !ISO_TZ.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) {
    return 'achieved_at phải là ISO 8601 có múi giờ';
  }
  if (!isInt(e.seed)) return 'seed phải là số nguyên';
  return null;
}

const clean = (e) => ({ name: normalizeName(e.name), score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed });

/** Sắp theo score giảm dần; bằng điểm thì đạt trước (achieved_at sớm hơn) đứng trên; bằng nữa thì giữ thứ tự cũ. */
export function sortEntries(entries) {
  return entries
    .map((e, i) => [e, i])
    .sort(([a, i], [b, j]) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at) || i - j)
    .map(([e]) => e);
}

/**
 * Thêm một mục, giữ top 10. Trả về { entries, rank } với rank = vị trí 0-based của mục mới, −1 nếu không lọt top.
 * Mục mới bằng điểm và cùng thời điểm với mục cũ thì đứng sau (mục cũ đạt trước).
 */
export function insertEntry(entries, entry) {
  const err = entryError(entry);
  if (err) throw new Error(err);
  const item = clean(entry);
  const all = sortEntries([...(entries || []).filter((e) => !entryError(e)).map(clean), item]);
  const top = all.slice(0, LEADERBOARD_MAX);
  return { entries: top, rank: top.indexOf(item) };
}

/** Đọc dữ liệu đã lưu (có thể hỏng): bỏ mục sai, sắp lại, cắt top 10. */
export function sanitizeBoard(doc) {
  const list = Array.isArray(doc?.entries) ? doc.entries : [];
  return sortEntries(list.filter((e) => !entryError(e)).map(clean)).slice(0, LEADERBOARD_MAX);
}

/** Thời điểm hiện tại dạng ISO 8601 kèm múi giờ máy, vd 2026-11-21T14:05:09+07:00. */
export function isoWithOffset(date = new Date()) {
  const p = (n, w = 2) => String(Math.trunc(Math.abs(n))).padStart(w, '0');
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}` +
    `${sign}${p(off / 60)}:${p(off % 60)}`;
}
