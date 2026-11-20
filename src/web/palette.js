// Bảng màu chuẩn TICKET-02 Phần 3 mục 8 (nguồn duy nhất cho web; test: tests/web-palette.test.js).
// Thuần JS, không import three, để test bằng Node.
export const PALETTE = {
  sky: 0x0e1430, // trời đêm
  fog: 0x1b2350, // sương
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a, // biển mây
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteHalo: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRim: 0x7a3cff,
  shadeStunned: 0x3a3450,
  mayShirt: 0xe8e2d0, // áo Mây
  mayScarf: 0xc8102e, // khăn Mây
  charm: 0xc8102e, // Bùa Gió (đỏ)
  gold: 0xf2c14e, // viền vàng, điểm số
  drifter: 0x8fa3b8, // Gió Lạc
  uiDanger: 0xff5a5f,
  uiText: 0xf5f1e6,
};

// Chế độ "Bảng màu dễ phân biệt" (TICKET-03 mục 6): chỉ đổi viền/mắt Bóng Mực và màu cảnh báo UI.
export const COLORBLIND = {
  shadeRim: 0x00b3ff,
  uiDanger: 0xffffff, // kèm biểu tượng ⚠ (thêm ở UI)
};
/** Bảng màu đang dùng: bảng chuẩn, hoặc bảng chuẩn ghi đè bởi COLORBLIND. */
export const paletteFor = (colorblind) => (colorblind ? { ...PALETTE, ...COLORBLIND } : PALETTE);

/** Nhấp nháy chậm 1 Hz cho đèn sắp hết dầu: sáng nửa giây, tối nửa giây. */
export const blinkOn = (timeSec) => timeSec - Math.floor(timeSec) < 0.5;

export const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// Ánh sáng môi trường tăng theo tiến độ: 0.15 + 0.55 × (đèn sáng / tổng đèn).
export function ambientIntensity(lit, total) {
  return 0.15 + 0.55 * (total > 0 ? lit / total : 0);
}
