/**
 * ============================================================
 *  EVENTBUS.JS — Pub/Sub System (Singleton)
 *  Digunakan untuk komunikasi antar modul tanpa ketergantungan.
 * ============================================================
 */

export class EventBus {
  static #listeners = new Map();

  /**
   * Mendaftarkan callback untuk sebuah event.
   * @param {string} event - Nama event (contoh: 'window:opened').
   * @param {Function} callback - Fungsi yang dipanggil saat event di-emit.
   */
  static on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(callback);
  }

  /**
   * Mendaftarkan callback yang hanya dipanggil SEKALI, lalu otomatis dihapus.
   * @param {string} event - Nama event.
   * @param {Function} callback - Fungsi yang dipanggil sekali.
   */
  static once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Menghapus callback dari sebuah event.
   * Jika callback tidak diberikan, hapus semua listener untuk event tersebut.
   * @param {string} event - Nama event.
   * @param {Function} [callback] - Fungsi yang akan dihapus.
   */
  static off(event, callback) {
    if (!this.#listeners.has(event)) return;
    if (callback) {
      const callbacks = this.#listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      if (callbacks.length === 0) {
        this.#listeners.delete(event);
      }
    } else {
      this.#listeners.delete(event);
    }
  }

  /**
   * Mengirim (memicu) sebuah event dengan data payload.
   * @param {string} event - Nama event.
   * @param {*} data - Data yang dikirim ke subscriber.
   */
  static emit(event, data) {
    if (!this.#listeners.has(event)) return;
    // Salin daftar listener agar aman jika ada yang dihapus saat eksekusi
    const callbacks = [...this.#listeners.get(event)];
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (error) {
        console.error(`[EventBus] Error di listener '${event}':`, error);
      }
    }
  }

  /**
   * Menghapus semua listener (untuk reset state).
   */
  static clear() {
    this.#listeners.clear();
  }
}
