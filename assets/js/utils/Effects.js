/**
 * ============================================================
 *  EFFECTS.JS — Visual Effects (Canvas Confetti)
 *  Efek confetti, particle, dan visual feedback.
 *  Menggunakan canvas-confetti dari CDN.
 *  Fallback ke CSS animation jika CDN gagal.
 * ============================================================
 */

export class Effects {
  static #confettiLoaded = false;
  static #loadingPromise = null;
  static #activeParticles = [];

  /**
   * Memuat canvas-confetti dari CDN.
   * @returns {Promise<boolean>}
   */
  static async load() {
    if (this.#confettiLoaded) return true;
    if (this.#loadingPromise) return this.#loadingPromise;

    this.#loadingPromise = new Promise((resolve) => {
      try {
        if (window.confetti) {
          this.#confettiLoaded = true;
          console.log("[Effects] canvas-confetti sudah tersedia.");
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js";
        script.async = true;

        script.onload = () => {
          this.#confettiLoaded = true;
          console.log("[Effects] canvas-confetti dimuat dari CDN.");
          resolve(true);
        };

        script.onerror = () => {
          console.warn("[Effects] Gagal memuat canvas-confetti. Menggunakan CSS fallback.");
          this.#confettiLoaded = false;
          resolve(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("[Effects] Error saat memuat canvas-confetti:", error);
        this.#confettiLoaded = false;
        resolve(false);
      }
    });

    return this.#loadingPromise;
  }

  /**
   * Efek confetti standar (sukses, kemenangan).
   * @param {Object} options
   */
  static confetti(options = {}) {
    if (this.#confettiLoaded && window.confetti) {
      try {
        window.confetti({
          particleCount: options.particleCount || 100,
          spread: options.spread || 70,
          origin: options.origin || { y: 0.6 },
          colors: options.colors || ["#33ff33", "#000080", "#ffffff", "#ffcc00", "#ff0000"],
          gravity: options.gravity || 1.2,
          scalar: options.scalar || 1.2,
          ticks: options.ticks || 200,
          ...options,
        });
      } catch (error) {
        console.warn("[Effects] Confetti gagal:", error);
        this._fallbackConfetti();
      }
    } else {
      this._fallbackConfetti();
    }
  }

  /**
   * Efek confetti dari sisi kiri (seperti tembakan).
   * @param {Object} options
   */
  static confettiLeft(options = {}) {
    if (this.#confettiLoaded && window.confetti) {
      try {
        window.confetti({
          particleCount: options.particleCount || 50,
          angle: options.angle || 60,
          spread: options.spread || 55,
          origin: options.origin || { x: 0, y: 0.6 },
          colors: ["#33ff33", "#00ff00", "#1a8c1a"],
          ...options,
        });
      } catch (error) {
        console.warn("[Effects] Confetti left gagal:", error);
      }
    }
  }

  /**
   * Efek confetti dari sisi kanan.
   * @param {Object} options
   */
  static confettiRight(options = {}) {
    if (this.#confettiLoaded && window.confetti) {
      try {
        window.confetti({
          particleCount: options.particleCount || 50,
          angle: options.angle || 120,
          spread: options.spread || 55,
          origin: options.origin || { x: 1, y: 0.6 },
          colors: ["#33ff33", "#00ff00", "#1a8c1a"],
          ...options,
        });
      } catch (error) {
        console.warn("[Effects] Confetti right gagal:", error);
      }
    }
  }

  /**
   * Efek fireworks (ledakan dari tengah).
   * @param {Object} options
   */
  static fireworks(options = {}) {
    if (this.#confettiLoaded && window.confetti) {
      try {
        const duration = options.duration || 3000;
        const end = Date.now() + duration;
        const interval = setInterval(() => {
          if (Date.now() > end) {
            clearInterval(interval);
            return;
          }
          window.confetti({
            particleCount: 30,
            startVelocity: 30,
            spread: 360,
            origin: {
              x: Math.random(),
              y: Math.random() * 0.5,
            },
            colors: ["#33ff33", "#000080", "#ffffff", "#ffcc00"],
            ticks: 100,
          });
        }, 250);
      } catch (error) {
        console.warn("[Effects] Fireworks gagal:", error);
      }
    } else {
      this._fallbackConfetti();
    }
  }

  /**
   * Efek sukses saat kasus terpecahkan.
   */
  static caseSolved() {
    if (this.#confettiLoaded && window.confetti) {
      try {
        // Confetti dari kiri
        this.confettiLeft({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.5 } });
        // Confetti dari kanan
        setTimeout(() => {
          this.confettiRight({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.5 } });
        }, 300);
        // Confetti dari tengah bawah
        setTimeout(() => {
          this.confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.7 } });
        }, 600);
        // Fireworks
        setTimeout(() => {
          this.fireworks({ duration: 2000 });
        }, 900);
      } catch (error) {
        console.warn("[Effects] Case solved effect gagal:", error);
        this._fallbackConfetti();
      }
    } else {
      this._fallbackConfetti();
    }
  }

  /**
   * Efek bukti baru ditemukan.
   */
  static evidenceFound() {
    if (this.#confettiLoaded && window.confetti) {
      try {
        window.confetti({
          particleCount: 40,
          spread: 50,
          origin: { x: 0.5, y: 0.3 },
          colors: ["#33ff33", "#00ff00", "#88ff88"],
          gravity: 1.5,
          scalar: 0.8,
          ticks: 150,
        });
      } catch (error) {
        console.warn("[Effects] Evidence found effect gagal:", error);
      }
    } else {
      this._fallbackFlash();
    }
  }

  /**
   * Efek peringatan (deadline mendekat).
   */
  static warning() {
    if (this.#confettiLoaded && window.confetti) {
      try {
        window.confetti({
          particleCount: 20,
          spread: 30,
          origin: { x: 0.5, y: 0.2 },
          colors: ["#ff0000", "#ff4444", "#ff8800"],
          gravity: 0.8,
          scalar: 0.6,
          ticks: 100,
        });
      } catch (error) {
        console.warn("[Effects] Warning effect gagal:", error);
      }
    } else {
      this._fallbackFlash();
    }
  }

  /**
   * Fallback confetti menggunakan CSS animation.
   */
  static _fallbackConfetti() {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999;
    `;

    const colors = ["#33ff33", "#000080", "#ffffff", "#ffcc00", "#ff0000"];

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 4 + Math.random() * 8;
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 1 + Math.random() * 2;

      particle.style.cssText = `
        position: absolute;
        top: -10px;
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
        opacity: 0.9;
      `;
      container.appendChild(particle);
    }

    document.body.appendChild(container);

    // Pastikan keyframe ada
    if (!document.getElementById("effects-fallback-style")) {
      const style = document.createElement("style");
      style.id = "effects-fallback-style";
      style.textContent = `
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes flashEffect {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => container.remove(), 4000);
  }

  /**
   * Fallback flash effect.
   */
  static _fallbackFlash() {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255, 255, 0, 0.2);
      pointer-events: none;
      z-index: 9998;
      animation: flashEffect 0.5s ease;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
  }

  /**
   * Hapus semua particle aktif.
   */
  static cleanup() {
    for (const particle of this.#activeParticles) {
      try {
        if (particle && particle.parentNode) {
          particle.remove();
        }
      } catch (e) {
        // ignore
      }
    }
    this.#activeParticles = [];
  }
}