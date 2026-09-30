/**
 * ============================================================
 *  FLOORPLAN.JS — Denah Wisma & Mesin Navigasi
 * ------------------------------------------------------------
 *  Denah dibaca dari cases/<case>/office.json (data-driven).
 *  Navigasi memakai GRAF RUANGAN (bukan grid tile), sehingga:
 *   • murah dihitung (A* di atas ~16 node),
 *   • agen berjalan lewat pintu, bukan menembus tembok,
 *   • mudah digambar sebagai "peta keamanan" retro.
 *
 *  Titik perjalanan (waypoint) = posisi awal → titik pintu (sisi A)
 *  → titik pintu (sisi B) → ... → titik tujuan di ruangan akhir.
 * ============================================================
 */

export class FloorPlan {
  /**
   * @param {Object} data - isi office.json
   */
  constructor(data) {
    this.data = data;
    this.grid = data.grid || { cols: 54, rows: 35, tile: 16 };

    /** @type {Map<string,Object>} */
    this.rooms = new Map();
    for (const r of data.rooms || []) {
      this.rooms.set(r.id, {
        ...r,
        cx: r.x + r.w / 2,
        cy: r.y + r.h / 2,
        occupants: new Set(),
        blackout: false,
        blackoutUntil: null,
      });
    }

    /** @type {Map<string,Object>} */
    this.stations = new Map();
    for (const s of data.stations || []) this.stations.set(s.id, s);

    /** @type {Array<Object>} */
    this.doors = (data.doors || []).map((d) => ({ ...d }));

    /** Graf tetangga: roomId -> [{door, to}] */
    this.adjacency = new Map();
    for (const id of this.rooms.keys()) this.adjacency.set(id, []);
    for (const d of this.doors) {
      if (!this.rooms.has(d.from) || !this.rooms.has(d.to)) {
        console.warn(`[FloorPlan] Pintu ${d.id} merujuk ruangan tak dikenal.`);
        continue;
      }
      this.adjacency.get(d.from).push({ door: d, to: d.to });
      this.adjacency.get(d.to).push({ door: d, to: d.from });
    }
  }

  // ============================================================
  //  AKSES
  // ============================================================

  room(id) {
    return this.rooms.get(id) || null;
  }

  roomName(id) {
    return this.rooms.get(id)?.name || id || "?";
  }

  station(id) {
    return this.stations.get(id) || null;
  }

  get roomList() {
    return [...this.rooms.values()];
  }

  /** Ruangan yang bersebelahan langsung. */
  neighbors(roomId) {
    return (this.adjacency.get(roomId) || []).map((e) => e.to);
  }

  /** Cari pintu antara dua ruangan (kalau bersebelahan). */
  doorBetween(a, b) {
    return this.doors.find(
      (d) => (d.from === a && d.to === b) || (d.from === b && d.to === a)
    ) || null;
  }

  /** Titik tengah sebuah ruangan (untuk berdiri santai). */
  roomCenter(roomId) {
    const r = this.room(roomId);
    if (!r) return { x: 2, y: 2 };
    return { x: r.cx, y: r.cy };
  }

  /** Titik acak deterministik di dalam ruangan (dipakai saat berganti tugas). */
  randomPoint(roomId, rnd = Math.random) {
    const r = this.room(roomId);
    if (!r) return { x: 2, y: 2 };
    return {
      x: r.x + 1 + rnd() * Math.max(1, r.w - 2),
      y: r.y + 1 + rnd() * Math.max(1, r.h - 2),
    };
  }

  /** Titik stasiun kerja, atau titik acak di ruangan stasiun itu. */
  stationPoint(stationId, roomId = null, rnd = Math.random) {
    const s = this.station(stationId);
    if (s) return { x: s.x + 0.5, y: s.y + 0.5, station: s.id, room: s.room };
    if (roomId) return this.randomPoint(roomId, rnd);
    return { x: 2, y: 2 };
  }

  /** Stasiun di ruangan tertentu (boleh difilter tag). */
  stationsInRoom(roomId, tag = null) {
    return [...this.stations.values()].filter(
      (s) => s.room === roomId && (!tag || (s.tags || []).includes(tag))
    );
  }

  /** Ruangan mana yang memuat titik (x,y)? */
  roomAt(x, y) {
    for (const r of this.rooms.values()) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
    }
    return null;
  }

  // ============================================================
  //  BLACKOUT (sensor mati → tidak ada yang bisa melihat)
  // ============================================================

  setBlackout(roomId, untilClockMinutes = Infinity) {
    const r = this.room(roomId);
    if (!r) return;
    r.blackout = true;
    r.blackoutUntil = untilClockMinutes;
  }

  clearBlackout(roomId) {
    const r = this.room(roomId);
    if (!r) return;
    r.blackout = false;
    r.blackoutUntil = null;
  }

  /** Update blackout yang punya batas waktu. */
  tickBlackout(clockMinutes) {
    for (const r of this.rooms.values()) {
      if (r.blackout && typeof r.blackoutUntil === "number" && clockMinutes >= r.blackoutUntil) {
        r.blackout = false;
        r.blackoutUntil = null;
      }
    }
  }

  isVisible(roomId) {
    const r = this.room(roomId);
    return !!r && !r.blackout;
  }

  // ============================================================
  //  PATHFINDING (A* di atas graf ruangan)
  // ============================================================

  /**
   * Rute ruangan terpendek.
   * @param {string} fromRoom
   * @param {string} toRoom
   * @param {Object} [opts] - {allowWindow:boolean}
   * @returns {Array<{room:string, door: ?Object}>} langkah demi langkah
   */
  findRoute(fromRoom, toRoom, opts = {}) {
    if (!this.rooms.has(fromRoom) || !this.rooms.has(toRoom)) return [];
    if (fromRoom === toRoom) return [{ room: toRoom, door: null }];

    const g = new Map([[fromRoom, 0]]);
    const prev = new Map();
    const open = new Set([fromRoom]);
    const goal = toRoom;

    const heuristic = (a, b) => {
      const ra = this.room(a);
      const rb = this.room(b);
      return Math.hypot(ra.cx - rb.cx, ra.cy - rb.cy);
    };

    let guard = 0;
    while (open.size > 0 && guard++ < 500) {
      // ambil node dengan f terkecil
      let current = null;
      let bestF = Infinity;
      for (const id of open) {
        const f = (g.get(id) ?? Infinity) + heuristic(id, goal);
        if (f < bestF) {
          bestF = f;
          current = id;
        }
      }
      if (current === goal) break;
      open.delete(current);

      for (const edge of this.adjacency.get(current) || []) {
        if (edge.door.locked) continue; // pintu terkunci tidak bisa dilewati
        if (edge.door.type === "window" && !opts.allowWindow) continue;

        const step =
          Math.hypot(edge.door.ax - edge.door.bx, edge.door.ay - edge.door.by) +
          heuristic(current, edge.to) * 0.35 +
          (edge.door.type === "window" ? 6 : 0) + // jendela: usaha ekstra
          (edge.door.type === "gate" ? 1 : 0);

        const tentative = (g.get(current) ?? Infinity) + step + heuristic(current, edge.to);
        if (tentative < (g.get(edge.to) ?? Infinity)) {
          g.set(edge.to, tentative);
          prev.set(edge.to, { room: current, door: edge.door });
          open.add(edge.to);
        }
      }
    }

    // rekonstruksi
    if (!prev.has(goal) && fromRoom !== goal) return [];
    const route = [];
    let cursor = goal;
    while (cursor && cursor !== fromRoom) {
      const p = prev.get(cursor);
      if (!p) break;
      route.unshift({ room: cursor, door: p.door });
      cursor = p.room;
    }
    route.unshift({ room: fromRoom, door: null });
    return route;
  }

  /**
   * Bangun daftar titik jalan (untuk animasi).
   * @param {{x:number,y:number,room:string}} from
   * @param {string} toRoom
   * @param {{x?:number,y?:number,station?:string}} [target] - titik akhir di ruangan tujuan
   * @param {Object} [opts]
   * @returns {Array<{x:number,y:number,room:string,label?:string}>}
   */
  buildWaypoints(from, toRoom, target = null, opts = {}) {
    const route = this.findRoute(from.room, toRoom, opts);
    if (route.length === 0) {
      // tidak ada rute → diam di tempat
      return [{ x: from.x, y: from.y, room: from.room }];
    }

    const pts = [{ x: from.x, y: from.y, room: from.room }];
    for (let i = 0; i < route.length - 1; i++) {
      const door = route[i + 1].door;
      const leavingRoom = route[i].room;
      // sisi pintu tergantung dari mana kita datang
      const aSide = door.from === leavingRoom;
      pts.push({
        x: aSide ? door.ax : door.bx,
        y: aSide ? door.ay : door.by,
        room: leavingRoom,
        label: door.label,
        doorId: door.id,
        doorType: door.type,
      });
      pts.push({
        x: aSide ? door.bx : door.ax,
        y: aSide ? door.by : door.ay,
        room: route[i + 1].room,
        label: door.label,
        doorId: door.id,
        doorType: door.type,
      });
    }

    const finalRoom = toRoom;
    let end;
    if (target && typeof target.x === "number") {
      end = { x: target.x, y: target.y, room: finalRoom, station: target.station };
    } else if (target?.station) {
      const sp = this.stationPoint(target.station, finalRoom);
      end = { ...sp, room: sp.room || finalRoom };
    } else {
      end = { ...this.roomCenter(finalRoom), room: finalRoom };
    }
    pts.push(end);

    // rapikan duplikat berurutan
    return pts.filter(
      (p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.y - arr[i - 1].y) > 0.05
    );
  }

  /** Panjang total rute dalam tile. */
  static pathLength(points) {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return d;
  }

  /** Apakah dua ruangan "berdekatan" (untuk persepsi samar-samar)? */
  isAdjacent(a, b) {
    if (a === b) return true;
    return this.neighbors(a).includes(b);
  }
}
