// Lưu/đọc bảng xếp hạng: ưu tiên server cục bộ (server.mjs hoặc vite dev) ghi ra đĩa save/leaderboard.json;
// mở bản web tĩnh không có server thì lưu trong trình duyệt (localStorage) để vẫn còn sau khi mở lại.
import { insertEntry, sanitizeBoard } from '../shared/leaderboard.js';

const LS = 'dao-den-long.leaderboard.v1';
const lsRead = () => { try { return sanitizeBoard(JSON.parse(localStorage.getItem(LS) || '{}')); } catch { return []; } };
const lsWrite = (entries) => { try { localStorage.setItem(LS, JSON.stringify({ entries })); } catch { /* bị chặn: bỏ qua */ } };

export async function loadBoard() {
  try {
    const r = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (r.ok) return { entries: (await r.json()).entries, where: 'disk' };
  } catch { /* không có server */ }
  return { entries: lsRead(), where: 'browser' };
}

/** Lưu một mục; trả về { entries, rank, where }. Ném lỗi khi dữ liệu sai (tên không hợp lệ…). */
export async function saveEntry(entry) {
  let r = null;
  try { r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) }); } catch { r = null; }
  if (r && r.status === 200) return { ...(await r.json()), where: 'disk' };
  if (r && r.status === 400) throw new Error((await r.json()).error);
  const res = insertEntry(lsRead(), entry); // ném lỗi nếu sai
  lsWrite(res.entries);
  return { ...res, where: 'browser' };
}
