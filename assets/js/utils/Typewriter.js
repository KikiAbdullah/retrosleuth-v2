/**
 * ============================================================
 *  TYPEWRITER.JS — Animasi Teks Karakter per Karakter
 *  Efek mesin ketik dengan fitur skip klik.
 * ============================================================
 */

/**
 * Menampilkan teks dengan efek typewriter.
 * @param {HTMLElement} element - Elemen tempat teks akan ditampilkan.
 * @param {string} text - Teks yang akan diketik.
 * @param {number} speed - Kecepatan per karakter (ms). Default: 30.
 * @param {boolean} skipOnClick - Apakah klik bisa skip. Default: true.
 * @returns {Promise<void>}
 */
export function typewrite(element, text, speed = 30, skipOnClick = true) {
  return new Promise((resolve) => {
    if (!element || !text) {
      resolve();
      return;
    }

    // Bersihkan elemen
    element.innerHTML = "";

    // Buat kursor berkedip
    const cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    cursor.textContent = "▌";
    element.appendChild(cursor);

    let index = 0;
    let skipped = false;

    // Fungsi skip
    const skipHandler = () => {
      if (skipped) return;
      skipped = true;
      // Tampilkan semua teks langsung
      const textNode = document.createTextNode(text);
      element.innerHTML = "";
      element.appendChild(textNode);
      resolve();
    };

    if (skipOnClick) {
      element.addEventListener("click", skipHandler);
    }

    // Fungsi ketik
    function typeChar() {
      if (skipped) return;

      if (index >= text.length) {
        // Selesai
        cursor.remove();
        element.removeEventListener("click", skipHandler);
        resolve();
        return;
      }

      // Sisipkan karakter sebelum kursor
      const char = text.charAt(index);
      const textNode = document.createTextNode(char);
      element.insertBefore(textNode, cursor);
      index++;

      // Schedule karakter berikutnya
      setTimeout(typeChar, speed);
    }

    // Mulai
    typeChar();
  });
}
