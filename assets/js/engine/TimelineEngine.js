/**
 * ============================================================
 *  TIMELINEENGINE.JS — Pengelola Data Timeline
 *  Memuat, mengurutkan, dan menyediakan data timeline.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { caseLoader } from "./CaseLoader.js";

export class TimelineEngine {
  static events = [];
  static enhancedEvents = [];

  /**
   * Memuat data timeline dari case.json.
   * @param {Array} timelineData - Array dari case.json timeline.
   */
  static loadTimeline(timelineData) {
    if (!timelineData || timelineData.length === 0) {
      this.events = [];
      this.enhancedEvents = [];
      return;
    }

    this.events = timelineData.map((event, index) => ({
      ...event,
      index: index,
      hour: parseInt(event.time?.split(".")[0] || "00"),
      minute: parseInt(event.time?.split(".")[1] || "00"),
    }));

    // Urutkan berdasarkan waktu
    this.events.sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    // Perkaya dengan referensi bukti
    this.enhancedEvents = this.events.map((event) => {
      const enhanced = { ...event };
      // Cari bukti yang terkait (berdasarkan ID yang disebut di deskripsi atau evidence_links)
      if (event.evidence_links) {
        enhanced.evidence_links = event.evidence_links;
      } else {
        // Coba deteksi otomatis dari deskripsi
        const allEvidence = caseLoader.activeCase?.evidence_registry || [];
        const links = [];
        for (const evi of allEvidence) {
          if (
            event.description.includes(evi.id) ||
            event.description.includes(evi.title)
          ) {
            links.push(evi.id);
          }
        }
        enhanced.evidence_links = links;
      }
      return enhanced;
    });

    console.log(`[TimelineEngine] ${this.events.length} peristiwa dimuat.`);
    EventBus.emit("timeline:loaded", { count: this.events.length });
  }

  /**
   * Mendapatkan semua event timeline.
   * @returns {Array}
   */
  static getEvents() {
    return [...this.events];
  }

  /**
   * Mendapatkan event yang ditingkatkan (dengan evidence_links).
   * @returns {Array}
   */
  static getEnhancedEvents() {
    return [...this.enhancedEvents];
  }

  /**
   * Mendapatkan event berdasarkan tipe.
   * @param {string} type - 'confrontation', 'movement', 'incident', 'discovery'
   * @returns {Array}
   */
  static getEventsByType(type) {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Mendapatkan event yang melibatkan karakter tertentu.
   * @param {string} charId
   * @returns {Array}
   */
  static getEventsByParticipant(charId) {
    return this.events.filter(
      (e) => e.participants && e.participants.includes(charId)
    );
  }

  /**
   * Mendapatkan event yang terkait dengan bukti tertentu.
   * @param {string} eviId
   * @returns {Array}
   */
  static getEventsByEvidence(eviId) {
    return this.enhancedEvents.filter(
      (e) => e.evidence_links && e.evidence_links.includes(eviId)
    );
  }

  /**
   * Mendapatkan event dalam rentang waktu.
   * @param {string} startTime - Format "HH.MM"
   * @param {string} endTime - Format "HH.MM"
   * @returns {Array}
   */
  static getEventsInTimeRange(startTime, endTime) {
    const startHour = parseInt(startTime.split(".")[0]);
    const startMinute = parseInt(startTime.split(".")[1]);
    const endHour = parseInt(endTime.split(".")[0]);
    const endMinute = parseInt(endTime.split(".")[1]);

    return this.events.filter((e) => {
      const eventTime = e.hour * 60 + e.minute;
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      return eventTime >= start && eventTime <= end;
    });
  }

  /**
   * Memicu highlight pada timeline untuk bukti tertentu.
   * @param {string} eviId
   */
  static highlightEvidence(eviId) {
    const relatedEvents = this.getEventsByEvidence(eviId);
    EventBus.emit("timeline:highlight", {
      evidenceId: eviId,
      eventIndices: relatedEvents.map((e) => e.index),
    });
  }

  /**
   * Mereset engine.
   */
  static reset() {
    this.events = [];
    this.enhancedEvents = [];
  }

  /**
   * Mendapatkan ikon untuk tipe event.
   * @param {string} type
   * @returns {string}
   */
  static getEventIcon(type) {
    const icons = {
      confrontation: "😡",
      movement: "🚶",
      incident: "⚡",
      discovery: "💀",
      meeting: "🤝",
      travel: "🚗",
      phone: "📞",
      crime: "💀",
      interaction: "🗣️",
    };
    return icons[type] || "⏱️";
  }

  /**
   * Mendapatkan warna untuk tipe event.
   * @param {string} type
   * @returns {string}
   */
  static getEventColor(type) {
    const colors = {
      confrontation: "#ff4444",
      movement: "#4488ff",
      incident: "#ffaa00",
      discovery: "#44ff44",
      meeting: "#8844ff",
      travel: "#44bbff",
      phone: "#ff8844",
      crime: "#ff0000",
      interaction: "#ff8800",
    };
    return colors[type] || "#888888";
  }
}
