/**
 * ============================================================
 *  MAIN.JS — Bootstrapper RetroSleuth (Fase 1 + 2 + 3 + 4)
 *  Entry point aplikasi. Menginisialisasi semua komponen UI,
 *  Window Manager, Desktop, Taskbar, Case Engine, Evidence,
 *  AI Core (Interrogation), Settings, dan Deduction (Fase 4).
 * ============================================================
 */

// ============================================================
//  1. IMPORTS
// ============================================================

// --- Core ---
import { EventBus } from "./core/EventBus.js";
import { Store, GameState } from "./core/Store.js";

// --- UI Foundation (Fase 1) ---
import { WindowManager } from "./ui/WindowManager.js";
import { DesktopManager } from "./ui/DesktopManager.js";
import { Taskbar } from "./ui/Taskbar.js";

// --- Engine (Fase 2) ---
import { initCaseLoader, caseLoader } from "./engine/CaseLoader.js";
import { initEvidenceEngine, evidenceEngine } from "./engine/EvidenceEngine.js";

// --- Modules (Fase 2) ---
import { CaseHub } from "./modules/CaseHub.js";
import { CaseBriefing } from "./modules/CaseBriefing.js";
import { EvidenceViewer } from "./modules/EvidenceViewer.js";
import { CharacterDossier } from "./modules/CharacterDossier.js";

// --- Fase 3: AI Core ---
import { initAIClient, aiClient } from "./ai/AIClient.js";
import { InterrogationRoom } from "./modules/InterrogationRoom.js";
import { SettingsWindow } from "./modules/SettingsWindow.js";

// --- Fase 4: Deduction ---
import { SolutionEngine } from "./engine/SolutionEngine.js";
import { TimelineEngine } from "./engine/TimelineEngine.js";
import { AccusationForm } from "./modules/AccusationForm.js";
import { NotesApp } from "./modules/NotesApp.js";
import { TimelineViewer } from "./modules/TimelineViewer.js";
import { DatabaseManager } from "./utils/DatabaseManager.js";

// ============================================================
//  2. KONFIGURASI
// ============================================================

const CONFIG = {
  BOOT_DURATION: 2800, // Durasi boot sequence (ms)
};

// ============================================================
//  3. BOOT SEQUENCE (Animasi Terminal)
// ============================================================

function runBootSequence() {
  return new Promise((resolve) => {
    // ============================================================
    // 1. OVERLAY
    // ============================================================
    const overlay = document.createElement("div");
    overlay.id = "boot-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: #0a0a0a;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.6s ease;
      padding: 20px;
      box-sizing: border-box;
    `;

    // ============================================================
    // 2. TERMINAL — Fixed Height
    // ============================================================
    const terminal = document.createElement("div");
    terminal.style.cssText = `
      width: 100%;
      max-width: 680px;
      height: 440px;
      background: #050f05;
      border: 3px solid #1a4d1a;
      padding: 18px 22px 14px;
      box-shadow: 0 0 60px rgba(51,255,51,0.06), inset 0 0 40px rgba(51,255,51,0.015);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      font-family: 'VT323', 'Courier New', monospace;
    `;

    // --- Efek Scanline (CSS) ---
    const scanlineStyle = document.createElement("style");
    scanlineStyle.textContent = `
      #boot-terminal::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: repeating-linear-gradient(
          to bottom,
          transparent 0px,
          transparent 2px,
          rgba(0, 0, 0, 0.07) 2px,
          rgba(0, 0, 0, 0.07) 4px
        );
        pointer-events: none;
        z-index: 10;
      }
      #boot-terminal::after {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.25) 100%);
        pointer-events: none;
        z-index: 11;
      }
    `;
    document.head.appendChild(scanlineStyle);
    terminal.id = "boot-terminal";

    // ============================================================
    // 3. HEADER
    // ============================================================
    // ============================================================
    // HEADER — Minimalis DOS (Opsi 1)
    // ============================================================
    const header = document.createElement("div");
    header.style.cssText = `
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #1a4d1a;
  padding-bottom: 4px;
  margin-bottom: 10px;
  color: #55ff55;
  font-size: 16px;
  flex-shrink: 0;
  text-shadow: 0 0 6px rgba(51,255,51,0.12);
`;
    header.innerHTML = `
  <span style="font-weight: bold; letter-spacing: 1px;">RETROSLEUTH</span>
  <span style="font-size: 12px; color: #1a8c1a;">1973</span>
`;
    terminal.appendChild(header);

    // (Hapus subHeader dan headerBottom — tidak digunakan lagi)
    // ============================================================
    // 4. LOG AREA (Scrollable)
    // ============================================================
    const logContainer = document.createElement("div");
    logContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      font-size: 16px;
      line-height: 1.8;
      padding-right: 4px;
      color: #33ff33;
      text-shadow: 0 0 4px rgba(51,255,51,0.06);
    `;
    logContainer.id = "boot-log-container";
    terminal.appendChild(logContainer);

    // ============================================================
    // 5. PROGRESS BAR
    // ============================================================
    const progressContainer = document.createElement("div");
    progressContainer.style.cssText = `
      margin-top: 10px;
      border-top: 1px solid #1a4d1a;
      padding-top: 8px;
      flex-shrink: 0;
    `;
    progressContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #1a8c1a; margin-bottom: 3px; letter-spacing: 0.5px;">
        <span>⟡ SYSTEM INITIALIZATION</span>
        <span id="boot-progress-text">0%</span>
      </div>
      <div style="width: 100%; height: 8px; background: #0a1a0a; border: 1px solid #1a4d1a; overflow: hidden; box-shadow: inset 0 0 4px rgba(0,0,0,0.6);">
        <div id="boot-progress-bar" style="width: 0%; height: 100%; background: #33ff33; transition: width 0.4s ease; box-shadow: 0 0 12px #33ff33, inset 0 0 6px #88ff88;"></div>
      </div>
    `;
    terminal.appendChild(progressContainer);

    // ============================================================
    // 6. FOOTER
    // ============================================================
    const footer = document.createElement("div");
    footer.style.cssText = `
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #1a4d1a;
      border-top: 1px solid #1a4d1a;
      padding-top: 5px;
      flex-shrink: 0;
    `;
    footer.innerHTML = `
      <span id="boot-status" style="color: #1a8c1a;">◈ Booting...</span>
      <span id="boot-cursor" style="color: #33ff33; text-shadow: 0 0 8px #33ff33;">▌</span>
    `;
    terminal.appendChild(footer);

    overlay.appendChild(terminal);
    document.body.appendChild(overlay);

    // ============================================================
    // 7. REFERENSI ELEMEN
    // ============================================================
    const logContainerEl = document.getElementById("boot-log-container");
    const progressBar = document.getElementById("boot-progress-bar");
    const progressText = document.getElementById("boot-progress-text");
    const cursor = document.getElementById("boot-cursor");
    const status = document.getElementById("boot-status");

    // ============================================================
    // 8. STAGES — DOS Style (Clean)
    // ============================================================
    const stages = [
      { text: "  RETROSLEUTH BOOT v1.0", delay: 350, progress: 5 },
      { text: "  Memory Test: 4096 KB OK", delay: 450, progress: 15 },
      { text: "  Floppy Disk: A: Drive Ready", delay: 380, progress: 25 },
      { text: "  Loading DOS...", delay: 350, progress: 45 },
      { text: "  CONFIG.SYS loaded.", delay: 280, progress: 60 },
      { text: "  AUTOEXEC.BAT loaded.", delay: 320, progress: 75 },
      { text: "  C:\\\\> RETROSLEUTH", delay: 550, progress: 90 },
      { text: "  System ready.", delay: 450, progress: 100 },
    ];

    let currentStage = 0;

    // ============================================================
    // 9. TYPEWRITER — Clean DOM-based
    // ============================================================
    function typeLine(line, callback) {
      const chars = line.split("");
      let idx = 0;

      // Buat elemen baris baru
      const lineDiv = document.createElement("div");
      lineDiv.style.whiteSpace = "pre-wrap";
      lineDiv.style.wordBreak = "break-word";
      logContainerEl.appendChild(lineDiv);

      // Teks sementara
      let currentText = "";

      function typeChar() {
        if (idx < chars.length) {
          // 5% chance glitch (tampilkan karakter acak sebentar)
          if (Math.random() < 0.04 && idx > 1) {
            const glitchChar = String.fromCharCode(
              33 + Math.floor(Math.random() * 94)
            );
            lineDiv.textContent = currentText + glitchChar;
            setTimeout(() => {
              lineDiv.textContent = currentText + chars[idx];
              currentText += chars[idx];
              idx++;
              logContainerEl.scrollTop = logContainerEl.scrollHeight;
              setTimeout(typeChar, 20 + Math.random() * 25);
            }, 50);
            return;
          }

          // Normal typing
          currentText += chars[idx];
          lineDiv.textContent = currentText;
          idx++;
          logContainerEl.scrollTop = logContainerEl.scrollHeight;
          setTimeout(typeChar, 18 + Math.random() * 25);
        } else {
          // Selesai mengetik → tambahkan [OK] hijau
          const okSpan = document.createElement("span");
          okSpan.style.color = "#44ff44";
          okSpan.style.textShadow = "0 0 10px rgba(68,255,68,0.3)";
          okSpan.textContent = "  [OK]";
          lineDiv.appendChild(okSpan);
          logContainerEl.scrollTop = logContainerEl.scrollHeight;
          callback();
        }
      }

      typeChar();
    }

    // ============================================================
    // 10. RUN STAGE
    // ============================================================
    function runStage() {
      if (currentStage >= stages.length) {
        // Selesai
        cursor.textContent = "◆";
        cursor.style.color = "#44ff44";
        status.textContent = "◈ System Ready.";
        status.style.color = "#44ff44";
        progressBar.style.boxShadow =
          "0 0 20px #33ff33, inset 0 0 10px #88ff88";

        setTimeout(() => {
          overlay.style.opacity = "0";
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 550);
        }, 700);
        return;
      }

      const stage = stages[currentStage];
      progressBar.style.width = stage.progress + "%";
      progressText.textContent = stage.progress + "%";

      // Update status
      const statusText = stage.text.replace(/[^a-zA-Z0-9 .]/g, "").trim();
      status.textContent = "◈ " + (statusText || "Loading...");

      typeLine(stage.text, () => {
        currentStage++;
        setTimeout(runStage, stage.delay);
      });
    }

    // ============================================================
    // 11. EFEK FLICKER & GLITCH (Halus)
    // ============================================================
    let flickerInterval = setInterval(() => {
      if (Math.random() < 0.05) {
        terminal.style.opacity = 0.95 + Math.random() * 0.05;
        setTimeout(() => {
          terminal.style.opacity = "1";
        }, 50);
      }
    }, 800);

    let glitchInterval = setInterval(() => {
      if (Math.random() < 0.04) {
        const shift = (Math.random() - 0.5) * 2;
        terminal.style.transform = "translateX(" + shift + "px)";
        terminal.style.transition = "transform 0.02s";
        setTimeout(() => {
          terminal.style.transform = "translateX(0)";
        }, 60);
      }
    }, 1200);

    // ============================================================
    // 12. CURSOR BLINK
    // ============================================================
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bootBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      #boot-cursor { animation: bootBlink 0.7s infinite; }
    `;
    document.head.appendChild(style);

    // ============================================================
    // 13. CLEANUP
    // ============================================================
    const originalResolve = resolve;
    resolve = () => {
      clearInterval(flickerInterval);
      clearInterval(glitchInterval);
      originalResolve();
    };

    // ============================================================
    // 14. MULAI BOOT!
    // ============================================================
    // Coba mainkan suara boot
    setTimeout(() => {
      try {
        if (window.__RETROSLEUTH?.audioManager) {
          window.__RETROSLEUTH.audioManager.play("boot");
        }
      } catch (_) {}
    }, 300);

    runStage();
  });
}

// ============================================================
//  4. WINDOW WELCOME (Sambutan Otomatis)
// ============================================================

function openWelcomeWindow(wm) {
  const id = "welcome";
  if (wm.exists(id)) {
    wm.open(id);
    return;
  }

  const winEl = wm.register(id, {
    title: "📋 Selamat Datang, Detektif!",
    width: 600,
    height: 460,
    resizable: true,
    maximizable: true,
  });

  const body = winEl.querySelector(".window-body");
  body.style.padding = "0";
  body.style.background = "#f5f0e8";
  body.style.fontFamily = "var(--font-mono, monospace)";
  body.style.overflow = "hidden";

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <!-- ============================================ -->
      <!-- HEADER — Retro dengan gradien coklat          -->
      <!-- ============================================ -->
      <div style="
        background: linear-gradient(135deg, #1a0a00 0%, #2d1a0a 100%);
        padding: 16px 24px;
        border-bottom: 3px solid #8b6b4a;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      ">
        <span style="font-size: 32px;">🕵️</span>
        <div>
          <h1 style="
            margin: 0;
            color: #e8d5b0;
            font-size: 22px;
            letter-spacing: 2px;
            text-shadow: 0 0 10px rgba(232, 213, 176, 0.3);
          ">RetroSleuth</h1>
          <p style="
            margin: 0;
            color: #b8956a;
            font-size: 13px;
            letter-spacing: 1px;
          ">Case Files Detective</p>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <span style="color: #8b6b4a; font-size: 12px;">1979</span>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- KONTEN UTAMA                                  -->
      <!-- ============================================ -->
      <div style="
        flex: 1;
        padding: 20px 24px;
        overflow-y: auto;
        background: #fdfaf5;
        color: #2a1a0a;
      ">
        <p style="font-size: 15px; margin-top: 0; line-height: 1.6;">
          Selamat datang di <strong>RetroSleuth</strong> — game investigasi kriminal 
          yang membawa Anda ke era 1970-an. Gunakan terminal ini untuk menyelidiki 
          kasus-kasus rumit, menginterogasi tersangka, dan mengungkap kebenaran.
        </p>

        <!-- Grid fitur 2 kolom -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 20px;
          margin: 16px 0;
          padding: 12px 16px;
          background: #f0ebe0;
          border: 2px solid #d4c8b0;
          border-radius: 0;
        ">
          <div><span style="color: #8b6b4a;">📁</span> <strong>Case Files</strong> — Pilih kasus</div>
          <div><span style="color: #8b6b4a;">🔍</span> <strong>Evidence</strong> — Kumpulkan bukti</div>
          <div><span style="color: #8b6b4a;">👤</span> <strong>Dossier</strong> — Profil tersangka</div>
          <div><span style="color: #8b6b4a;">🗣️</span> <strong>Interrogation</strong> — Tanya tersangka</div>
          <div><span style="color: #8b6b4a;">⏱️</span> <strong>Timeline</strong> — Kronologi</div>
          <div><span style="color: #8b6b4a;">📝</span> <strong>Notes</strong> — Catatan</div>
          <div><span style="color: #8b6b4a;">⚖️</span> <strong>Accusation</strong> — Ajukan tuduhan</div>
          <div><span style="color: #8b6b4a;">⚙️</span> <strong>Settings</strong> — Konfigurasi</div>
        </div>

        <!-- Tip -->
        <div style="
          padding: 12px 16px;
          background: #e8e0d5;
          border-left: 6px solid #8b6b4a;
          margin: 12px 0;
          font-size: 14px;
        ">
          <strong style="color: #4a2a0a;">💡 Tip:</strong> 
          Double-click ikon desktop untuk membuka jendela. 
          Drag titlebar untuk memindahkan.
        </div>

        <!-- Shortcut keyboard -->
        <div style="
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #6a5a4a;
          border-top: 1px solid #d4c8b0;
          padding-top: 12px;
          margin-top: 12px;
          flex-wrap: wrap;
          gap: 4px;
        ">
          <span>⌨️ <kbd style="background:#eee; padding:1px 6px; border:1px solid #ccc; border-radius:2px;">Ctrl+Tab</kbd> cycle window</span>
          <span><kbd style="background:#eee; padding:1px 6px; border:1px solid #ccc; border-radius:2px;">Esc</kbd> tutup</span>
          <span><kbd style="background:#eee; padding:1px 6px; border:1px solid #ccc; border-radius:2px;">F1</kbd> help</span>
          <span><kbd style="background:#eee; padding:1px 6px; border:1px solid #ccc; border-radius:2px;">F12</kbd> CRT toggle</span>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- FOOTER                                        -->
      <!-- ============================================ -->
      <div style="
        padding: 8px 24px;
        background: #2d1a0a;
        color: #b8956a;
        font-size: 12px;
        text-align: center;
        border-top: 2px solid #4a2a0a;
        flex-shrink: 0;
      ">
        <span>🕵️‍♂️ Selamat menyelidik, Detektif!</span>
      </div>
    </div>
  `;

  wm.open(id);
}

// ============================================================
//  5. KEYBOARD SHORTCUTS GLOBAL
// ============================================================

function setupKeyboardShortcuts(wm) {
  document.addEventListener("keydown", (e) => {
    // Ctrl+Tab → Cycle window
    if (e.ctrlKey && e.key === "Tab") {
      e.preventDefault();
      const openWindows = [];
      for (const [id, entry] of wm.windows) {
        if (["open", "active", "maximized"].includes(entry.state)) {
          openWindows.push(id);
        }
      }
      if (openWindows.length === 0) return;

      let currentIdx = openWindows.indexOf(wm.activeWindowId);
      if (currentIdx === -1) currentIdx = openWindows.length - 1;
      const nextIdx = (currentIdx + 1) % openWindows.length;
      wm.bringToFront(openWindows[nextIdx]);
      return;
    }

    // Escape → Tutup window aktif (kecuali welcome)
    if (e.key === "Escape") {
      const activeId = wm.activeWindowId;
      if (activeId && activeId !== "welcome") {
        wm.close(activeId);
      }
      return;
    }

    // F1 → Help (buka welcome)
    if (e.key === "F1") {
      e.preventDefault();
      openWelcomeWindow(wm);
      return;
    }

    // F12 → Toggle CRT
    if (e.key === "F12") {
      e.preventDefault();
      document.body.classList.toggle("crt-off");
      return;
    }

    // Ctrl+S → Quick Save (Fase 4)
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      GameState.saveSync();
      return;
    }
  });
}

// ============================================================
//  6. ERROR HANDLER GLOBAL
// ============================================================

function setupErrorHandler() {
  window.addEventListener("error", (event) => {
    console.error(
      "[RetroSleuth] ❌ Uncaught Error:",
      event.error || event.message
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[RetroSleuth] ❌ Unhandled Rejection:", event.reason);
  });
}

// ============================================================
//  7. INISIALISASI APLIKASI
//   [FIX] Sekarang ASYNC agar bisa menggunakan await!
// ============================================================

async function initializeApp() {
  // --- 7.1 Fase 1: UI Foundation ---
  const wm = new WindowManager();

  const desktop = new DesktopManager(wm);

  const taskbar = new Taskbar(wm);

  // --- 7.2 Fase 2: Core Engine ---
  // Store (GameState) sudah auto-init via singleton

  // CaseLoader
  const loader = initCaseLoader("./cases");

  // EvidenceEngine
  const eviEngine = initEvidenceEngine();

  // --- 7.3 Fase 2: Modules UI ---
  const caseHub = new CaseHub(wm);
  const caseBriefing = new CaseBriefing(wm);
  const evidenceViewer = new EvidenceViewer(wm);
  const characterDossier = new CharacterDossier(wm);

  // ============================================================
  //  [FIX] REGISTER EVIDENCE SAAT KASUS DIMUAT
  // ============================================================
  EventBus.on("case:loaded", ({ caseData }) => {
    if (caseData.evidence_registry && caseData.evidence_registry.length > 0) {
      evidenceEngine.registerEvidence(caseData.evidence_registry);
    } else {
      console.warn("[RetroSleuth] ⚠️ Kasus tidak memiliki evidence_registry.");
    }
  });

  // --- 7.4 Fase 3: AI Core ---
  // Inisialisasi Settings Window (memuat settings dari localStorage)
  const settings = new SettingsWindow(wm);

  // Inisialisasi AI Client dengan settings yang sudah dimuat
  const aiConfig = settings.settings;
  const ai = initAIClient(aiConfig.endpoint, aiConfig.apiKey, aiConfig.model);

  // Modul Interrogation
  const interrogationRoom = new InterrogationRoom(wm);

  // --- 7.5 Fase 4: Deduction ---
  // Inisialisasi DatabaseManager (IndexedDB)
  await DatabaseManager.init();

  // Modul Fase 4
  const accusationForm = new AccusationForm(wm);
  const notesApp = new NotesApp(wm);
  const timelineViewer = new TimelineViewer(wm);

  // --- 7.6 Load saved state jika ada (setelah case dimuat) ---
  EventBus.on("case:loaded", async ({ caseData }) => {
    const caseId = caseData.id;
    if (!caseId) return;

    try {
      const savedState = await DatabaseManager.loadCaseState(caseId);
      if (savedState) {
        // Restore state ke GameState
        GameState.restoreState(savedState);

        // Update interrogation states di GameState
        if (savedState.interrogationStates) {
          for (const [charId, state] of Object.entries(
            savedState.interrogationStates
          )) {
            GameState.setInterrogationState(charId, state);
          }
        }

        console.log(
          `[RetroSleuth] ✅ State untuk ${caseId} dimuat dari IndexedDB.`
        );
        console.log(
          `  📊 ${savedState.discoveredEvidence?.length || 0} bukti ditemukan`
        );
        console.log(
          `  💬 ${
            Object.keys(savedState.chatHistories || {}).length
          } riwayat chat`
        );
      } else {
        console.log(
          `[RetroSleuth] ℹ️ Tidak ada save untuk ${caseId}. Memulai baru.`
        );
      }
    } catch (error) {
      console.warn("[RetroSleuth] ⚠️ Gagal memuat state:", error);
    }
  });

  // --- 7.7 Auto-save sebelum close/tab ditutup ---
  window.addEventListener("beforeunload", () => {
    const caseId = GameState.currentCaseId;
    if (caseId && GameState.caseStatus === "active") {
      GameState.saveSync();
    }
  });

  // --- 7.8 Patch DesktopManager._openWindow agar terhubung ke modul ---
  desktop._openWindow = function (id, title) {
    const moduleMap = {
      casehub: () => caseHub.open(),
      evidence: () => evidenceViewer.open(),
      dossier: () => characterDossier.open(),
      interrogation: () => {
        // Cek apakah ada kasus aktif
        if (!caseLoader.activeCase) {
          // Jika tidak ada kasus, buka CaseHub dulu
          caseHub.open();
          return;
        }

        // Jika ada kasus aktif, buka daftar karakter untuk dipilih
        const chars = caseLoader.activeCase.characters || [];
        if (chars.length === 0) {
          alert("⚠️ Tidak ada karakter untuk diinterogasi dalam kasus ini.");
          return;
        }

        // Jika hanya 1 karakter, langsung buka interogasi
        if (chars.length === 1) {
          EventBus.emit("interrogation:start", { characterId: chars[0].id });
          return;
        }

        // Jika lebih dari 1, buka Dossier agar user memilih
        characterDossier.open();
      },
      timeline: () => timelineViewer.open(),
      notes: () => notesApp.open(),
      accusation: () => accusationForm.open(),
      settings: () => settings.open(),
    };

    if (moduleMap[id]) {
      moduleMap[id]();
      return;
    }

    // Fallback: jika modul belum siap, buka window kosong
    if (this.wm.exists(id)) {
      this.wm.open(id);
      return;
    }
    const winEl = this.wm.register(id, {
      title: title,
      width: 520,
      height: 360,
      resizable: true,
      maximizable: true,
    });
    const body = winEl.querySelector(".window-body");
    body.innerHTML = `
      <div style="padding: 20px; font-family: var(--font-mono, monospace);">
        <h2 style="color: #000080;">📂 ${title}</h2>
        <p style="color: #666; margin-top: 8px;">
          Modul ini belum diimplementasikan.
        </p>
      </div>
    `;
    this.wm.open(id);
  };

  // --- 7.9 Update Ikon Desktop (Fase 4) ---
  desktop.icons = [
    { id: "casehub", label: "📁 Case Files", windowId: "casehub" },
    { id: "evidence", label: "🔍 Evidence", windowId: "evidence" },
    { id: "dossier", label: "👤 Dossier", windowId: "dossier" },
    {
      id: "interrogation",
      label: "🗣️ Interrogation",
      windowId: "interrogation",
    },
    { id: "timeline", label: "⏱️ Timeline", windowId: "timeline" },
    { id: "notes", label: "📝 Notes", windowId: "notes" },
    { id: "accusation", label: "⚖️ Accusation", windowId: "accusation" },
    { id: "settings", label: "⚙️ Settings", windowId: "settings" },
  ];
  desktop.render();

  // --- 7.10 Expose ke global untuk debugging ---
  window.__RETROSLEUTH = {
    wm,
    desktop,
    taskbar,
    loader,
    eviEngine,
    caseHub,
    caseBriefing,
    evidenceViewer,
    characterDossier,
    aiClient,
    interrogationRoom,
    settings,
    accusationForm,
    notesApp,
    timelineViewer,
    solutionEngine: SolutionEngine,
    timelineEngine: TimelineEngine,
    databaseManager: DatabaseManager,
    GameState,
    EventBus,
  };

  // --- 7.11 Buka Welcome Window ---
  openWelcomeWindow(wm);

  // --- 7.12 Load Index Kasus Otomatis ---
  loader.loadGlobalIndex().catch((err) => {
    console.warn("[RetroSleuth] ⚠️ Gagal memuat index.json:", err);
    console.warn(
      "[RetroSleuth] Pastikan folder cases/ ada dan berisi index.json"
    );
  });

  return { wm, desktop, taskbar };
}

// ============================================================
//  8. START!
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 8.1 Boot Sequence
    await runBootSequence();

    // 8.2 Init Aplikasi (Fase 1 + 2 + 3 + 4)
    // [FIX] Sekarang panggil dengan await karena initializeApp adalah async
    const { wm } = await initializeApp();

    // 8.3 Setup Keyboard Shortcuts
    setupKeyboardShortcuts(wm);

    // 8.4 Setup Global Error Handler
    setupErrorHandler();

    // 8.5 Emit event bahwa aplikasi sudah siap
    EventBus.emit("app:ready", { version: "1.0.0", phase: 4 });
  } catch (error) {
    console.error("[RetroSleuth] 💥 Boot gagal:", error);
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #030a02;
        color: #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-family: 'VT323', monospace;
        padding: 40px;
        z-index: 99999;
        text-align: center;
      ">
        <h1 style="font-size: 32px; margin-bottom: 20px;">💥 BOOT FAILED</h1>
        <p style="font-size: 18px; color: #ff8888; max-width: 600px;">
          ${error.message || "Unknown error"}
        </p>
        <p style="font-size: 14px; color: #ff6666; margin-top: 8px; max-width: 600px; word-break: break-all;">
          ${error.stack || ""}
        </p>
        <button 
          onclick="location.reload()" 
          style="
            margin-top: 30px;
            padding: 12px 32px;
            background: #1a4d1a;
            color: #33ff33;
            border: 2px solid #33ff33;
            font-family: 'VT323', monospace;
            font-size: 20px;
            cursor: pointer;
          "
        >
          🔄 RELOAD
        </button>
        <p style="margin-top: 16px; font-size: 14px; color: #1a8c1a;">
          Periksa Console (F12) untuk detail error.
        </p>
      </div>
    `;
  }
});
