/**
 * ============================================================
 *  INTERROGATIONROOM.JS — Ruang Interogasi AI
 *  Chat, emotion bars, evidence strip, typewriter effect.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";
import { aiClient } from "../ai/AIClient.js";
import { typewrite } from "../utils/Typewriter.js";

export class InterrogationRoom {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = null; // Akan di-set per karakter
    this.suspectId = null;
    this.isLoading = false;

    // Event: mulai interogasi dari Dossier atau tempat lain
    EventBus.on("interrogation:start", ({ characterId }) => {
      this.open(characterId);
    });
  }

  /**
   * Membuka ruang interogasi untuk karakter tertentu.
   * @param {string} suspectId
   */
  open(suspectId) {
    this.suspectId = suspectId;
    this.windowId = `interrogation_${suspectId}`;

    const charData = caseLoader.getCharacterData(suspectId);
    if (!charData) {
      console.warn(
        `[InterrogationRoom] Karakter ${suspectId} tidak ditemukan.`
      );
      return;
    }

    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const charImage = caseLoader.getCharacterImage(suspectId);

    const winEl = this.wm.register(this.windowId, {
      title: `🗣️ Interogasi — ${charData.name}`,
      width: 700,
      height: 560,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this._buildUI(winEl, charData, charImage);
    this._renderChatHistory();
    this._updateEmotionBars();
  }

  /**
   * Membangun UI di dalam window.
   * @param {HTMLElement} winEl
   * @param {Object} charData
   * @param {string|null} charImage
   */
  _buildUI(winEl, charData, charImage) {
    const body = winEl.querySelector(".window-body");
    body.className = "window-body";
    body.innerHTML = `
      <div class="interrogation-container">
        <!-- Header: Foto, Nama & Status -->
        <div class="interrogation-header">
          <img class="interrogation-photo" src="${charImage || ""}" alt="${charData.name}" onerror="this.style.display='none'">
          <div class="interrogation-header-info">
            <span class="interrogation-name">${charData.name}</span>
            <span class="interrogation-role">${charData.role || ""}</span>
          </div>
        </div>

        <!-- Emotion Bars -->
        <div class="emotion-bars" id="emotion-bars-${this.suspectId}">
          <div class="emotion-bar-wrapper">
            <div class="emotion-bar-label"><span>Trust</span><span id="trust-val-${
              this.suspectId
            }">50%</span></div>
            <div class="emotion-bar-track"><div class="emotion-bar-fill trust" id="trust-bar-${
              this.suspectId
            }" style="width:50%"></div></div>
          </div>
          <div class="emotion-bar-wrapper">
            <div class="emotion-bar-label"><span>Stress</span><span id="stress-val-${
              this.suspectId
            }">50%</span></div>
            <div class="emotion-bar-track"><div class="emotion-bar-fill stress" id="stress-bar-${
              this.suspectId
            }" style="width:50%"></div></div>
          </div>
          <div class="emotion-bar-wrapper">
            <div class="emotion-bar-label"><span>Fear</span><span id="fear-val-${
              this.suspectId
            }">50%</span></div>
            <div class="emotion-bar-track"><div class="emotion-bar-fill fear" id="fear-bar-${
              this.suspectId
            }" style="width:50%"></div></div>
          </div>
          <div class="emotion-bar-wrapper">
            <div class="emotion-bar-label"><span>Anger</span><span id="anger-val-${
              this.suspectId
            }">50%</span></div>
            <div class="emotion-bar-track"><div class="emotion-bar-fill anger" id="anger-bar-${
              this.suspectId
            }" style="width:50%"></div></div>
          </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area" id="chat-area-${this.suspectId}"></div>

        <!-- Evidence Strip -->
        <div class="evidence-strip" id="evidence-strip-${this.suspectId}"></div>

        <!-- Input Area -->
        <div class="input-area">
          <textarea id="input-${
            this.suspectId
          }" rows="2" placeholder="Ketik pertanyaan Anda..." disabled></textarea>
          <button id="send-${this.suspectId}" disabled>Kirim</button>
          <div id="loading-${this.suspectId}" style="display:none;">
            <span class="loading-spinner"></span>
          </div>
        </div>
      </div>
    `;

    // --- Event: Send ---
    const input = body.querySelector(`#input-${this.suspectId}`);
    const sendBtn = body.querySelector(`#send-${this.suspectId}`);
    const loadingEl = body.querySelector(`#loading-${this.suspectId}`);

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text || this.isLoading) return;
      this._sendMessage(text);
    };

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Enable input setelah chat history dimuat
    input.disabled = false;
    sendBtn.disabled = false;

    // --- Render evidence strip ---
    this._renderEvidenceStrip();

    // --- Subscribe ke perubahan emosi ---
    EventBus.on("interrogation:stateChanged", ({ suspectId, deltas }) => {
      if (suspectId === this.suspectId) {
        this._updateEmotionBars();
      }
    });

    // --- Subscribe ke unlock evidence (update strip) ---
    EventBus.on("evidence:unlocked", () => {
      if (this.wm.isOpen(this.windowId)) {
        this._renderEvidenceStrip();
      }
    });
  }

  /**
   * Mengirim pesan ke AI.
   * @param {string} message
   */
  async _sendMessage(message) {
    if (this.isLoading || !aiClient) {
      console.warn(
        "[InterrogationRoom] AI Client belum siap atau sedang loading."
      );
      return;
    }

    this.isLoading = true;
    const input = document.querySelector(`#input-${this.suspectId}`);
    const sendBtn = document.querySelector(`#send-${this.suspectId}`);
    const loadingEl = document.querySelector(`#loading-${this.suspectId}`);

    input.disabled = true;
    sendBtn.disabled = true;
    loadingEl.style.display = "inline-block";

    // Tampilkan pesan user di chat
    this._addChatMessage("user", message);

    // Tampilkan indikator "mengetik..." di chat
    const chatArea = document.querySelector(`#chat-area-${this.suspectId}`);
    const typingDiv = document.createElement("div");
    typingDiv.className = "chat-message assistant typing-indicator";
    typingDiv.id = `typing-${this.suspectId}`;
    const charData = caseLoader.getCharacterData(this.suspectId);
    const charName = charData?.name || this.suspectId;
    typingDiv.innerHTML = `<span class="message-role">🤖 ${charName}</span><span class="message-content"><span class="loading-spinner" style="vertical-align:middle;"></span> <em>Sedang berpikir...</em></span>`;
    chatArea.appendChild(typingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
      const result = await aiClient.sendMessage(this.suspectId, message);
      // Hapus indikator typing
      typingDiv.remove();
      // Tampilkan respons AI dengan typewriter
      const msgDiv = document.createElement("div");
      msgDiv.className = "chat-message assistant";
      msgDiv.innerHTML = `<span class="message-role">🤖 ${charName}</span><span class="message-content"></span>`;
      chatArea.appendChild(msgDiv);
      chatArea.scrollTop = chatArea.scrollHeight;

      const contentSpan = msgDiv.querySelector(".message-content");
      await typewrite(contentSpan, result.reply, 30, true);

      // Jika respons berhasil, update emosi (sudah diproses di AIClient)
      if (result.success) {
        this._updateEmotionBars();
      }
    } catch (error) {
      console.error("[InterrogationRoom] Error:", error);
      const typingEl = document.querySelector(`#typing-${this.suspectId}`);
      if (typingEl) typingEl.remove();
      this._addChatMessage(
        "assistant",
        "[ERROR] Gagal mendapatkan respons dari AI."
      );
    } finally {
      this.isLoading = false;
      input.disabled = false;
      sendBtn.disabled = false;
      loadingEl.style.display = "none";
      input.value = "";
      input.focus();
    }
  }

  /**
   * Menambahkan pesan ke chat area.
   * @param {string} role - 'user' atau 'assistant'
   * @param {string} content
   */
  _addChatMessage(role, content) {
    const chatArea = document.querySelector(`#chat-area-${this.suspectId}`);
    if (!chatArea) return;

    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${role}`;
    let label;
    if (role === "user") {
      label = "🧑 Detektif";
    } else {
      const charData = caseLoader.getCharacterData(this.suspectId);
      const name = charData?.name || this.suspectId;
      label = `🤖 ${name}`;
    }
    msgDiv.innerHTML = `
      <span class="message-role">${label}</span>
      <span class="message-content">${content}</span>
    `;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  /**
   * Merender riwayat chat dari GameState.
   */
  _renderChatHistory() {
    const history = GameState.getChatHistory(this.suspectId);
    const chatArea = document.querySelector(`#chat-area-${this.suspectId}`);
    if (!chatArea) return;

    chatArea.innerHTML = "";
    for (const msg of history) {
      const role = msg.role === "user" ? "user" : "assistant";
      this._addChatMessage(role, msg.content);
    }
  }

  /**
   * Memperbarui emotion bars dari GameState secara realtime.
   * Dipanggil setiap kali AI memberikan response.
   */
  _updateEmotionBars() {
    const emotion = GameState.getInterrogationState(this.suspectId);
    if (!emotion) return;

    const bars = {
      trust: document.querySelector(`#trust-bar-${this.suspectId}`),
      stress: document.querySelector(`#stress-bar-${this.suspectId}`),
      fear: document.querySelector(`#fear-bar-${this.suspectId}`),
      anger: document.querySelector(`#anger-bar-${this.suspectId}`),
    };
    const vals = {
      trust: document.querySelector(`#trust-val-${this.suspectId}`),
      stress: document.querySelector(`#stress-val-${this.suspectId}`),
      fear: document.querySelector(`#fear-val-${this.suspectId}`),
      anger: document.querySelector(`#anger-val-${this.suspectId}`),
    };

    for (const key of ["trust", "stress", "fear", "anger"]) {
      const val = emotion[key] || 0;
      if (bars[key]) {
        bars[key].style.width = `${val}%`;
      }
      if (vals[key]) {
        vals[key].textContent = `${val}%`;
      }
    }

    // Emit event agar dossier list juga update status dot
    EventBus.emit("interrogation:stateChanged", {
      suspectId: this.suspectId,
      emotion,
    });
  }

  /**
   * Merender evidence strip (chip bukti yang sudah ditemukan).
   */
  _renderEvidenceStrip() {
    const strip = document.querySelector(`#evidence-strip-${this.suspectId}`);
    if (!strip) return;

    const discovered = evidenceEngine.getDiscoveredEvidence();
    strip.innerHTML = "";

    if (discovered.length === 0) {
      strip.innerHTML =
        '<span style="font-size:12px; color:#888;">Belum ada bukti ditemukan.</span>';
      return;
    }

    for (const evi of discovered) {
      const chip = document.createElement("button");
      chip.className = "evidence-chip";
      chip.textContent = `${evi.icon || "📄"} ${evi.title}`;
      chip.title = `Sodorkan bukti: ${evi.title}`;
      chip.dataset.eviId = evi.id;
      chip.addEventListener("click", () => {
        this._presentEvidence(evi.id);
      });
      strip.appendChild(chip);
    }
  }

  /**
   * Menyodorkan bukti ke AI.
   * @param {string} eviId
   */
  async _presentEvidence(eviId) {
    const evi = evidenceEngine.getEvidenceMeta(eviId);
    if (!evi) return;

    const message = `[MENYODORKAN BUKTI: ${evi.title} (${eviId})]`;
    await this._sendMessage(message);
  }
}
