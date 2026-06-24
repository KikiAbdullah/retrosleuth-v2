/**
 * ============================================================
 *  TIMELINEVIEWER.JS — Visualisasi Timeline
 *  Menampilkan kronologi peristiwa secara visual.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { TimelineEngine } from "../engine/TimelineEngine.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";

export class TimelineViewer {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "timeline";
    this.isOpen = false;
    this.filterByEvidence = false;
    this.filterCharacter = null;

    // Load timeline saat case dimuat
    EventBus.on("case:loaded", ({ caseData }) => {
      if (caseData.timeline) {
        TimelineEngine.loadTimeline(caseData.timeline);
      }
      if (this.wm.isOpen(this.windowId)) {
        this.renderContent();
      }
    });

    // Highlight saat bukti ditemukan
    EventBus.on("evidence:unlocked", ({ evidenceId }) => {
      if (this.wm.isOpen(this.windowId)) {
        TimelineEngine.highlightEvidence(evidenceId);
        this.renderContent();
      }
    });
  }

  /**
   * Membuka viewer timeline.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    if (!caseLoader.activeCase) {
      alert("⚠️ Tidak ada kasus yang sedang aktif.");
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "⏱️ Timeline Investigasi",
      width: 580,
      height: 440,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.isOpen = true;
    this.renderContent();
  }

  /**
   * Merender konten timeline.
   */
  renderContent() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;

    const body = winEl.querySelector(".window-body");
    if (!body) return;

    const events = TimelineEngine.getEnhancedEvents();

    if (events.length === 0) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">⏱️ Tidak ada data timeline</p>
          <p style="font-size: 14px; color: #999;">Kasus ini belum memiliki timeline yang terdefinisi.</p>
        </div>
      `;
      return;
    }

    // Filter
    let filteredEvents = [...events];

    // Filter berdasarkan bukti yang ditemukan
    if (this.filterByEvidence) {
      const discovered = GameState.getDiscoveredEvidence();
      filteredEvents = filteredEvents.filter((e) => {
        if (!e.evidence_links || e.evidence_links.length === 0) return false;
        return e.evidence_links.some((eviId) => discovered.includes(eviId));
      });
    }

    // Filter berdasarkan karakter
    if (this.filterCharacter) {
      filteredEvents = filteredEvents.filter((e) => {
        if (!e.participants) return false;
        return e.participants.includes(this.filterCharacter);
      });
    }

    // Dapatkan daftar karakter untuk filter
    const characters = caseLoader.activeCase?.characters || [];
    const charOptions = characters.map((c) => ({ id: c.id, name: c.name }));

    // Bangun HTML
    let html = `
      <div style="padding: 12px; font-family: var(--font-mono, monospace); height: 100%; display: flex; flex-direction: column;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; flex-shrink: 0;">
          <h2 style="color: #000080; margin: 0; font-size: 18px;">⏱️ Timeline</h2>
          <span style="font-size: 12px; color: #888;">${
            events.length
          } peristiwa</span>
          <div style="margin-left: auto; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <label style="font-size: 13px;">
              <input type="checkbox" id="filter-evidence" ${
                this.filterByEvidence ? "checked" : ""
              }>
              Hanya bukti ditemukan
            </label>
            <select id="filter-character" style="
              font-family: var(--font-mono, monospace);
              padding: 2px 6px;
              border: 1px solid #888;
              background: #fff;
            ">
              <option value="">Semua Karakter</option>
              ${charOptions
                .map(
                  (c) => `
                <option value="${c.id}" ${
                    this.filterCharacter === c.id ? "selected" : ""
                  }>${c.name}</option>
              `
                )
                .join("")}
            </select>
          </div>
        </div>

        <div style="
          flex: 1;
          overflow-y: auto;
          padding: 8px 4px;
          background: #0a0a0a;
          border: 2px solid #1a4d1a;
          position: relative;
        ">
          ${
            filteredEvents.length === 0
              ? `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 16px;">
              Tidak ada peristiwa yang sesuai dengan filter.
            </div>
          `
              : `
            <div style="position: relative; padding-left: 20px;">
              ${filteredEvents
                .map((event, index) => {
                  const icon = TimelineEngine.getEventIcon(event.type);
                  const color = TimelineEngine.getEventColor(event.type);
                  const isLast = index === filteredEvents.length - 1;
                  const hasEvidence =
                    event.evidence_links && event.evidence_links.length > 0;
                  const isHighlighted = event._highlighted || false;

                  return `
                  <div class="timeline-event" data-event-index="${
                    event.index
                  }" style="
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: ${isLast ? "0" : "14px"};
                    cursor: ${hasEvidence ? "pointer" : "default"};
                    position: relative;
                    ${isHighlighted ? "animation: timelinePulse 0.5s 3;" : ""}
                  ">
                    <div style="
                      font-family: var(--font-mono, monospace);
                      font-size: 13px;
                      color: #33ff33;
                      width: 50px;
                      text-align: right;
                      margin-right: 12px;
                      flex-shrink: 0;
                    ">${event.time || "??:??"}</div>
                    <div style="
                      width: 14px;
                      height: 14px;
                      border-radius: 50%;
                      background: ${color};
                      border: 2px solid #1a4d1a;
                      margin-right: 12px;
                      flex-shrink: 0;
                      margin-top: 2px;
                      ${!isLast ? "box-shadow: 0 0 8px " + color : ""}
                      position: relative;
                      z-index: 1;
                    "></div>
                    <div style="
                      flex: 1;
                      font-size: 14px;
                      color: #33ff33;
                      line-height: 1.4;
                    ">
                      <span style="margin-right: 6px;">${icon}</span>
                      ${event.description}
                      ${
                        hasEvidence
                          ? ` <span style="font-size: 11px; color: #1a8c1a;">🔗 ${event.evidence_links.length} bukti</span>`
                          : ""
                      }
                    </div>
                    ${
                      !isLast
                        ? `
                      <div style="
                        position: absolute;
                        left: 76px;
                        top: 18px;
                        width: 2px;
                        height: calc(100% + 14px);
                        background: #1a4d1a;
                        opacity: 0.3;
                      "></div>
                    `
                        : ""
                    }
                  </div>
                `;
                })
                .join("")}
            </div>
          `
          }
        </div>

        <div style="margin-top: 8px; font-size: 11px; color: #888; flex-shrink: 0; display: flex; gap: 16px; flex-wrap: wrap; border-top: 1px solid #eee; padding-top: 8px;">
          <span>😡 Pertengkaran</span>
          <span>🗣️ Interaksi</span>
          <span>🚶 Pergerakan</span>
          <span>⚡ Kejadian</span>
          <span>💀 Kejahatan</span>
          <span>🔍 Penemuan</span>
          <span style="color: #666;">Klik peristiwa untuk lihat bukti terkait</span>
        </div>
      </div>
    `;

    body.innerHTML = html;

    // --- Event Listeners ---

    // Filter: Bukti ditemukan
    body.querySelector("#filter-evidence")?.addEventListener("change", (e) => {
      this.filterByEvidence = e.target.checked;
      this.renderContent();
    });

    // Filter: Karakter
    body.querySelector("#filter-character")?.addEventListener("change", (e) => {
      this.filterCharacter = e.target.value || null;
      this.renderContent();
    });

    // Klik event → buka bukti terkait
    body.querySelectorAll(".timeline-event").forEach((el) => {
      el.addEventListener("click", () => {
        const index = parseInt(el.dataset.eventIndex);
        const events = TimelineEngine.getEnhancedEvents();
        const event = events[index];
        if (event && event.evidence_links && event.evidence_links.length > 0) {
          // Buka bukti pertama yang terkait
          const eviId = event.evidence_links[0];
          // Cek apakah bukti sudah ditemukan
          const discovered = GameState.getDiscoveredEvidence();
          if (discovered.includes(eviId)) {
            EventBus.emit("evidence:view", { evidenceId: eviId });
          } else {
            // Bukti belum ditemukan, beri tahu user
            if (window.__RETROSLEUTH?.notificationSystem) {
              window.__RETROSLEUTH.notificationSystem.add(
                `🔒 Bukti "${eviId}" belum ditemukan. Lanjutkan investigasi!`,
                `locked-${eviId}`
              );
            }
          }
        } else if (event) {
          console.log("[Timeline] Event:", event.description);
        }
      });
    });
  }
}
