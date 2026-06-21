/**
 * ============================================================
 *  NOTESAPP.JS — Notepad Detektif
 *  Textarea dengan auto-save (debounce 1 detik).
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { SearchEngine } from "../utils/SearchEngine.js";

export class NotesApp {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "notes";
    this.saveTimeout = null;
    this.isOpen = false;

    // Auto-save saat case:loaded
    EventBus.on("case:loaded", () => {
      if (this.wm.isOpen(this.windowId)) {
        this._loadNotes();
      }
    });
  }

  /**
   * Membuka notepad.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    // Cek apakah ada kasus aktif
    if (!caseLoader.activeCase) {
      alert(
        "⚠️ Tidak ada kasus yang sedang aktif. Pilih kasus terlebih dahulu."
      );
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "📝 Detective Notes",
      width: 460,
      height: 380,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.isOpen = true;
    this._buildUI(winEl);
  }

  /**
   * Membangun UI notepad.
   * @param {HTMLElement} winEl
   */
  _buildUI(winEl) {
    const body = winEl.querySelector(".window-body");
    body.style.padding = "0";
    body.style.background = "#f5f0e8";
    body.style.fontFamily = "var(--font-mono, monospace)";

    // Load existing notes
    const notes = GameState.getNotes();

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <div style="padding: 6px 12px; background: #e8dcc8; border-bottom: 2px solid #c4b59b; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
          <span style="font-size: 14px; color: #5a4a3a;">📓 Buku Catatan Detektif</span>
          <span style="font-size: 12px; color: #888;" id="notes-wordcount">0 karakter</span>
        </div>
        <!-- Search Bar -->
        <div style="padding: 6px 12px; background: #d8d0c0; border-bottom: 1px solid #b0a898; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <input type="text" id="notes-search" placeholder="🔍 Cari di catatan..." style="
            flex: 1;
            padding: 4px 8px;
            font-family: 'VT323', monospace;
            font-size: 14px;
            border: 2px solid #888;
            border-right-color: #fff;
            border-bottom-color: #fff;
            border-left-color: #888;
            border-top-color: #888;
            background: #fff;
            color: #000;
            outline: none;
          " />
          <span id="notes-search-result" style="font-size: 12px; color: #000080; white-space: nowrap;"></span>
        </div>
        <textarea id="notes-textarea" style="
          flex: 1;
          width: 100%;
          padding: 16px;
          border: none;
          background: #f5f0e8;
          font-family: 'VT323', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.8;
          resize: none;
          outline: none;
          color: #2a2a2a;
          background-image: repeating-linear-gradient(
            transparent 0px,
            transparent 27px,
            #d4c8b0 27px,
            #d4c8b0 28px
          );
          background-size: 100% 28px;
          background-attachment: local;
        " placeholder="📝 Tulis catatan detektif Anda di sini...&#10;&#10;Gunakan untuk mencatat:&#10;- Kontradiksi alibi&#10;- Hubungan antar tersangka&#10;- Kronologi kejadian&#10;- Teori Anda">${notes}</textarea>
        <div style="padding: 4px 16px; background: #e8dcc8; border-top: 2px solid #c4b59b; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; font-size: 11px; color: #888;">
          <span>💾 Auto-save setiap 1 detik</span>
          <span id="notes-save-status">Tersimpan</span>
        </div>
      </div>
    `;

    const textarea = body.querySelector("#notes-textarea");
    const wordCount = body.querySelector("#notes-wordcount");
    const saveStatus = body.querySelector("#notes-save-status");

    // Update word count
    const updateWordCount = () => {
      const text = textarea.value;
      const count = text.length;
      wordCount.textContent = `${count} karakter`;
    };

    // Auto-save dengan debounce
    const saveNotes = () => {
      const text = textarea.value;
      GameState.setNotes(text);
      saveStatus.textContent = "💾 Tersimpan";
      saveStatus.style.color = "#4CAF50";
      setTimeout(() => {
        saveStatus.style.color = "#888";
      }, 2000);
    };

    // Debounce save (1 detik)
    const debounceSave = () => {
      saveStatus.textContent = "⏳ Menyimpan...";
      saveStatus.style.color = "#FF9800";
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(saveNotes, 1000);
    };

    // Event: Input
    textarea.addEventListener("input", () => {
      updateWordCount();
      debounceSave();
    });

    // Event: Blur (save langsung saat keluar)
    textarea.addEventListener("blur", () => {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      saveNotes();
    });

    // Event: Ctrl+S shortcut
    textarea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
        }
        saveNotes();
      }
    });

    // --- Search in Notes ---
    const searchInput = body.querySelector("#notes-search");
    const searchResult = body.querySelector("#notes-search-result");
    if (searchInput) {
      let searchTimeout = null;
      searchInput.addEventListener("input", () => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const query = searchInput.value.trim();
          if (query.length === 0) {
            searchResult.textContent = "";
            return;
          }
          const notesContent = textarea.value;
          const lowerContent = notesContent.toLowerCase();
          const lowerQuery = query.toLowerCase();
          let count = 0;
          let pos = 0;
          while ((pos = lowerContent.indexOf(lowerQuery, pos)) !== -1) {
            count++;
            pos += lowerQuery.length;
          }
          if (count > 0) {
            searchResult.textContent = `${count} ditemukan`;
            searchResult.style.color = "#000080";
            textarea.focus();
            const idx = lowerContent.indexOf(lowerQuery);
            if (idx !== -1) {
              textarea.setSelectionRange(idx, idx + query.length);
            }
          } else {
            searchResult.textContent = "Tidak ditemukan";
            searchResult.style.color = "#ff4444";
          }
        }, 300);
      });

      // Enter untuk cari berikutnya
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const query = searchInput.value.trim().toLowerCase();
          if (!query) return;
          const lowerContent = textarea.value.toLowerCase();
          const currentPos = textarea.selectionStart;
          const nextPos = lowerContent.indexOf(query, currentPos + 1);
          if (nextPos !== -1) {
            textarea.setSelectionRange(nextPos, nextPos + query.length);
            textarea.focus();
          }
        }
      });
    }

    // Initial load
    updateWordCount();
    saveStatus.textContent = "✅ Dimuat";
    setTimeout(() => {
      saveStatus.textContent = "Tersimpan";
      saveStatus.style.color = "#888";
    }, 1000);
  }

  /**
   * Memuat ulang notes dari GameState.
   */
  _loadNotes() {
    const textarea = document.querySelector("#notes-textarea");
    if (textarea) {
      const notes = GameState.getNotes();
      textarea.value = notes;
      const wordCount = document.querySelector("#notes-wordcount");
      if (wordCount) wordCount.textContent = `${notes.length} karakter`;
    }
  }
}
