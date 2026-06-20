/**
 * ============================================================
 *  FALLBACKMODE.JS — Respons Generik Saat AI Mati
 *  Menyediakan 6 template respons offline.
 * ============================================================
 */

const FALLBACK_RESPONSES = [
  "Tersangka menatap Anda dengan dingin. Sepertinya dia tidak ingin bicara saat ini.",
  "(Tersangka menggeleng pelan) 'Saya sudah bilang semua yang saya tahu.'",
  "Suasana hening. Hanya suara jam dinding yang terdengar.",
  "Tersangka menyilangkan tangan. 'Apa lagi yang Anda ingin tahu?'",
  "'Saya tidak menjawab pertanyaan itu tanpa pengacara saya.'",
  "Mata tersangka menerawang ke jendela, seolah mencari jawaban.",
];

/**
 * Mendapatkan respons fallback secara acak.
 * @returns {string}
 */
export function getFallbackResponse() {
  const index = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[index];
}

/**
 * Mendapatkan respons fallback dengan tambahan pesan error.
 * @param {string} errorMessage - Pesan error yang ingin ditampilkan.
 * @returns {string}
 */
export function getFallbackResponseWithError(errorMessage) {
  const base = getFallbackResponse();
  return `[ERROR: ${errorMessage}] ${base}`;
}
