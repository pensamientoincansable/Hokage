import { ARENA, ELEMENTS, MOVES, STATUS, PICKUPS, fusionUltimate } from "./config.js";

const GRAVITY = -38;
const JUMP_VY = 11.6;
const WALK_SPEED = 4.6;
const DASH_SPEED = 11;
const GROUND_ACCEL = 26;
const GROUND_FRICTION = 32;
const AIR_ACCEL = 24;
const AIR_DRAG = 1.6;
const AIR_MAX = 6.4;

export class Fighter {
  constructor(ninja, side, stats = {}) {
    this.ninja = ninja;
    this.side = side;
    this.x = side === 1 ? -3.2 : 3.2;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = side === 1 ? 1 : -1;
    this.maxHp = stats.hp || 100;
    this.hp = this.maxHp;
    this.chakra = 35;
    this.maxChakra = 100;
    this.dmgMul = stats.damage || 1;
    this.spdMul = stats.speed || 1;
    this.state = "idle";
    this.timer = 0;
    this.animLock = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.freeze = 0;
    this.flash = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.walkDir = 0;
    this.upHold = false;
    this.cd = { special1: 0, special2: 0, ultimate: 0, dash: 0 };
    this.dashTime = 0;
    this.bufferedAction = null;
    this.combo = 0;
    this.air = false;
    this.crouch = false;
    this.blocking = false;
    this.alive = true;
    this.move = null;
    this.attackHit = false;
    this.elements = ninja.appearance.elements || ["fire", "wind"];
    this.name = ninja.appearance.name || "Shinobi";
    this.statuses = [];
    this.buffs = { damage: 0, speed: 0, shield: 0 };
    this.lastHitBy = null;
  }

  get el1() {
    return ELEMENTS[this.elements[0]] || ELEMENTS.fire;
  }
  get el2() {
    return ELEMENTS[this.elements[1]] || ELEMENTS.wind;
  }
  get ult() {
    return fusionUltimate(this.elements[0], this.elements[1]);
  }

  hasStatus(id) {
    return this.statuses.some((s) => s.id === id && s.until > 0);
  }
  frozen() {
    return this.freeze > 0;
  }
  spd() {
    return this.spdMul * (this.buffs.speed > 0 ? PICKUPS.speed.buff.speed : 1) * (this.hasStatus("soak") ? STATUS.soak.slow : 1);
  }
  dmgOut() {
    return this.dmgMul * (this.buffs.damage > 0 ? PICKUPS.power.buff.damage : 1) * (this.hasStatus("daze") ? STATUS.daze.weaken : 1);
  }
  dmgIn() {
    return this.hasStatus("brittle") ? STATUS.brittle.vuln : 1;
  }

  sync() {
    this.ninja.root.position.set(this.x, this.y, this.z);
    this.ninja.root.rotation.y = this.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

export class Match {
  constructor(p1, p2, opts = {}) {
    this.p1 = p1;
    this.p2 = p2;
    this.projectiles = [];
    this.traps = [];
    this.pickups = [];
    this.time = opts.time ?? 99;
    this.over = false;
    this.winner = null;
    this.hitstop = 0;
    this.intro = 1.6;
    this.interlude = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboOwner = null;
    this.comboRank = "";
    this.events = [];
    this.shake = 0;
    this.pickupCollector = opts.pickupCollector || p1;
    this.onEvent = opts.onEvent || (() => {});
  }

  other(f) {
    return f === this.p1 ? this.p2 : this.p1;
  }

  face() {
    const direction = this.p1.x <= this.p2.x ? 1 : -1;
    if (this.p1.alive && this.p1.animLock <= 0) this.p1.facing = direction;
    if (this.p2.alive && this.p2.animLock <= 0) this.p2.facing = -direction;
  }

  canAct(f) {
    return f.alive && f.hitstun <= 0 && f.blockstun <= 0 && f.freeze <= 0 && f.animLock <= 0 && !this.over && this.intro <= 0;
  }

  startMove(f, id) {
    const mv = MOVES[id];
    if (!mv || !this.canAct(f)) return false;
    f.state = id;
    f.blocking = false;
    f.pendingSpec = null;
    f.move = { ...mv, id, damage: mv.damage * f.dmgOut() };
    f.timer = 0;
    f.animLock = mv.startup + mv.active + mv.recovery;
    f.attackHit = false;
    f.ninja.animator.play(id, f.animLock, true);
    this.onEvent({ type: "attack", fighter: f, move: id });
    return true;
  }

  special(f, which) {
    if (!this.canAct(f)) return false;
    let spec;
    if (which === 3) {
      spec = { ...f.ult };
    } else if (which === 1) {
      spec = { ...f.el1.special, statuses: [f.el1.status] };
    } else {
      spec = { ...f.el2.special, statuses: [f.el2.status] };
    }
    const key = which === 3 ? "ultimate" : which === 1 ? "special1" : "special2";
    if (f.cd[key] > 0) return;
    const cost = spec.chakra ?? 24;
    if (f.chakra < cost) return;
    spec.color ||= which === 2 ? f.el2.color : f.el1.color;
    f.move = null;
    f.blocking = false;
    f.attackHit = false;
    f.chakra -= cost;
    f.cd[key] = spec.cooldown ?? 1.2;
    f.state = which === 3 ? "ultimate" : "special";
    f.animLock = which === 3 ? 0.7 : 0.45;
    f.timer = 0;
    f.pendingSpec = { spec, delay: which === 3 ? 0.28 : 0.16 };
    f.ninja.animator.play(f.state, f.animLock, true);
    this.onEvent({ type: "special", fighter: f, spec });
    return true;
  }

  spawnSpec(f, spec) {
    if (!f.alive || this.over) return;
    const opp = this.other(f);
    const color = spec.color || (ELEMENTS[f.elements[0]]?.color ?? "#fff");
    const statuses = spec.statuses || null;
    if (spec.type === "projectile") {
      this.projectiles.push({
        x: f.x + f.facing * 0.8,
        y: f.y + 1.15,
        vx: (spec.speed || 11) * f.facing,
        owner: f,
        damage: spec.damage * f.dmgOut(),
        size: spec.size || 0.35,
        hitstun: spec.hitstun || 0.35,
        knock: spec.knock || 2.6,
        chip: spec.chip || 2,
        life: 1.6,
        color,
        ultimate: !!spec.ultimate,
        statuses,
      });
    } else if (spec.type === "dash") {
      f.vx = (spec.speed || 14) * f.facing;
      f.invuln = 0.12;
      f.dashTime = 0.2;
      f.state = "dash";
      f.animLock = 0.32;
      f.timer = 0;
      f.attackHit = false;
      f.move = {
        damage: spec.damage * f.dmgOut(), hitstun: spec.hitstun || 0.45,
        knock: 4, range: 1.7, height: 1.4, chip: 3, statuses,
        startup: 0, active: 0.2, recovery: 0.12,
      };
      f.ninja.animator.play("dash", 0.32, true);
    } else if (spec.type === "trap") {
      this.traps.push({
        x: opp.x,
        y: 0,
        owner: f,
        damage: spec.damage * f.dmgOut(),
        hitstun: spec.hitstun || 0.5,
        age: 0,
        life: 0.55,
        color,
        statuses,
      });
    } else if (spec.type === "bind") {
      if (Math.abs(opp.x - f.x) < 4.5 && opp.y < 1.4) {
        this.applyHit(opp, f, spec.damage * f.dmgOut(), spec.hitstun || 0.8, 0.5, false, 0, statuses);
      }
    } else if (spec.type === "melee") {
      this.tryHit(
        f,
        opp,
        {
          damage: spec.damage * f.dmgOut(),
          hitstun: spec.hitstun || 0.5,
          knock: 3.4,
          range: spec.range || 2.2,
          height: 1.4,
          chip: 3,
          statuses,
        },
        true
      );
    }
  }

  tryHit(atk, def, mv, force = false) {
    if (!atk.alive || !def.alive || def.invuln > 0 || this.over || (atk.attackHit && !force)) return false;
    const dx = (def.x - atk.x) * atk.facing;
    const dy = Math.abs(def.y - atk.y);
    if (dx > 0.15 && dx < mv.range && dy < mv.height) {
      atk.attackHit = true;
      const blocked = def.blocking && def.hitstun <= 0 && def.facing === -atk.facing;
      this.applyHit(def, atk, mv.damage, mv.hitstun, mv.knock, blocked, mv.chip, mv.statuses);
      return true;
    }
    return false;
  }

  applyStatus(atk, def, id) {
    if (!id || def.invuln > 0) return;
    const st = STATUS[id];
    if (!st) return;
    if (id === "burn" || id === "soak" || id === "brittle" || id === "daze") {
      const ex = def.statuses.find((s) => s.id === id);
      if (ex) ex.until = Math.max(ex.until, st.duration || 0);
      else def.statuses.push({ id, until: st.duration || 0, tick: 0 });
    } else if (id === "freeze" || id === "shock") {
      const dur = id === "freeze" ? st.duration : st.stun;
      def.freeze = Math.max(def.freeze, dur);
      const ex = def.statuses.find((s) => s.id === id);
      if (ex) ex.until = Math.max(ex.until, dur);
      else def.statuses.push({ id, until: dur, tick: 0 });
    } else if (id === "drain") {
      const amt = st.chakra || 16;
      const taken = Math.min(def.chakra, amt);
      def.chakra -= taken;
      atk.chakra = Math.min(100, atk.chakra + taken);
    }
    // "gust" sólo modifica el empuje, se resuelve en applyHit.
  }

  applyHit(def, atk, damage, hitstun, knock, blocked, chip = 1, statuses = null) {
    if (this.over || def.invuln > 0 || !def.alive) return false;
    if (blocked) {
      def.hp = Math.max(Math.min(1, def.hp), def.hp - chip);
      def.blockstun = 0.18;
      def.vx = def.facing * -1.2;
      def.chakra = Math.min(100, def.chakra + 3);
      atk.chakra = Math.min(100, atk.chakra + 2);
      this.onEvent({ type: "block", atk, def });
      this.hitstop = 0.04;
      return true;
    }
    if (this.comboOwner !== atk) this.combo = 0;
    this.comboOwner = atk;
    const shielded = def.buffs.shield > 0;
    let scaled = damage;
    scaled *= 1 - Math.min(0.45, this.combo * 0.06);
    scaled *= def.dmgIn();
    if (shielded) {
      scaled *= 0.5;
      hitstun *= 0.4;
    }
    def.hp = Math.max(0, def.hp - scaled);
    def.hitstun = hitstun;
    def.state = "hurt";
    def.animLock = hitstun;
    def.ninja.animator.play("hurt", hitstun, true);
    def.move = null;
    def.pendingSpec = null;
    def.bufferedAction = null;
    def.dashTime = 0;
    def.walkDir = 0;
    def.blocking = false;
    def.vx = atk.facing * knock * (statuses && statuses.includes("gust") ? STATUS.gust.knock : 1);
    def.vy = def.y > 0 ? 2.5 : 1.2;
    def.crouch = false;
    def.flash = 0.12;
    def.lastHitBy = atk;
    atk.chakra = Math.min(100, atk.chakra + 8);
    if (statuses) statuses.forEach((s) => this.applyStatus(atk, def, s));
    this.combo += 1;
    this.comboTimer = 1.1;
    this.comboRank = this.combo > 10 ? "HOKAGE" : this.combo > 7 ? "SHINOBI" : this.combo > 4 ? "GREAT" : "GOOD";
    this.hitstop = atk.state === "ultimate" ? 0.14 : 0.055;
    this.shake = 0.18 + Math.min(0.25, scaled * 0.01);
    this.onEvent({ type: "hit", atk, def, damage: scaled, x: def.x, y: def.y + 1.2 });
    if (def.hp <= 0) this.ko(def, atk);
    return true;
  }

  ko(def, atk) {
    if (this.over || !def.alive) return;
    def.alive = false;
    def.hp = 0;
    def.state = "ko";
    for (const fighter of [def, atk]) {
      fighter.move = null; fighter.pendingSpec = null; fighter.bufferedAction = null;
      fighter.walkDir = 0; fighter.dashTime = 0; fighter.statuses = [];
    }
    atk.state = "win";
    def.ninja.animator.play("ko", 3, true);
    atk.ninja.animator.play("win", 3, true);
    this.over = true;
    this.winner = atk;
    this.onEvent({ type: "ko", winner: atk, loser: def });
  }

  spawnPickup(id, x) {
    const P = PICKUPS[id];
    if (!P) return;
    this.pickups.push({
      id,
      x: Math.max(ARENA.minX + 0.5, Math.min(ARENA.maxX - 0.5, x)),
      y: 0.25,
      life: 12,
      bob: Math.random() * Math.PI * 2,
      color: P.color,
      name: P.name,
    });
  }

  applyPickup(f, p) {
    const P = PICKUPS[p.id];
    if (!P) return;
    if (P.heal) f.hp = Math.min(f.maxHp, f.hp + P.heal);
    if (P.chakra) f.chakra = Math.min(100, f.chakra + P.chakra);
    if (P.buff) {
      if (P.buff.damage) f.buffs.damage = P.buff.time;
      if (P.buff.speed) f.buffs.speed = P.buff.time;
      if (P.buff.shield) f.buffs.shield = P.buff.shield;
    }
    this.onEvent({ type: "pickup", fighter: f, pickup: P });
  }

  control(f, input, dt = 1 / 60) {
    if (this.intro > 0 || !f.alive || (this.over && !this.interlude)) return;
    f.upHold = !!input.up;
    f.walkDir = 0;
    if (input.jump) f.jumpBuffer = 0.13;
    if (!this.interlude) {
      const action = ["ultimate", "special2", "special1", "kick", "heavy", "light", "dash"].find((key) => input[key]);
      if (action) f.bufferedAction = { action, remaining: 0.14, direction: input.dashDirection || Math.sign(input.axis) || f.facing };
    }
    if (this.hitstop > 0 || f.hitstun > 0 || f.blockstun > 0 || f.freeze > 0) return;

    const axis = Math.max(-1, Math.min(1, input.axis || 0));
    f.blocking = !!input.block && f.y <= 0 && f.animLock <= 0;
    f.crouch = !!input.down && f.y <= 0 && !f.blocking && f.animLock <= 0;
    if (f.jumpBuffer > 0 && f.animLock <= 0 && (f.y <= 0 || f.coyote > 0)) {
      f.vy = JUMP_VY;
      f.y = 0.02;
      f.jumpBuffer = 0;
      f.coyote = 0;
      f.blocking = false;
      f.crouch = false;
      f.state = "jump";
      f.ninja.animator.play("jump", 0, true);
      this.onEvent({ type: "jump", fighter: f });
    }
    if (input.upReleased && f.y > 0.1 && f.vy > 0) f.vy *= 0.45;

    if (f.animLock <= 0 && f.bufferedAction && !this.interlude) {
      const { action, direction } = f.bufferedAction;
      f.bufferedAction = null;
      if (action === "ultimate") this.special(f, 3);
      else if (action === "special2") this.special(f, 2);
      else if (action === "special1") this.special(f, 1);
      else if (action === "kick") this.startMove(f, f.y > 0.2 ? "airKick" : "kick");
      else if (action === "heavy") this.startMove(f, "heavy");
      else if (action === "light") this.startMove(f, f.crouch ? "crouchLight" : "light");
      else if (action === "dash" && f.y <= 0 && f.cd.dash <= 0) {
        f.vx = DASH_SPEED * direction * f.spd();
        f.state = "dash";
        f.move = null;
        f.blocking = false;
        f.crouch = false;
        f.animLock = 0.18;
        f.dashTime = 0.18;
        f.cd.dash = 0.48;
        f.invuln = 0.1;
        f.ninja.animator.play("dash", 0.18, true);
      }
    }
    if (f.animLock <= 0) {
      f.move = null;
      if (f.y > 0) { f.walkDir = axis; f.state = "jump"; }
      else if (f.blocking) f.state = "block";
      else if (f.crouch) f.state = "crouch";
      else if (axis) { f.walkDir = axis; f.state = "walk"; }
      else f.state = "idle";
      f.ninja.animator.play(f.state);
    }
    void dt;
  }

  physics(f, dt) {
    if (!f.alive) { f.ninja.update(dt, {}); f.sync(); return; }
    const previousTimer = f.timer;
    f.timer += dt;
    f.dashTime = Math.max(0, f.dashTime - dt);
    if (f.bufferedAction) {
      f.bufferedAction.remaining -= dt;
      if (f.bufferedAction.remaining <= 0) f.bufferedAction = null;
    }
    f.animLock = Math.max(0, f.animLock - dt);
    f.hitstun = Math.max(0, f.hitstun - dt);
    f.blockstun = Math.max(0, f.blockstun - dt);
    f.invuln = Math.max(0, f.invuln - dt);
    f.freeze = Math.max(0, f.freeze - dt);
    f.flash = Math.max(0, f.flash - dt);
    f.coyote = f.y <= 0 ? 0.1 : Math.max(0, f.coyote - dt);
    f.jumpBuffer = Math.max(0, f.jumpBuffer - dt);
    Object.keys(f.cd).forEach((k) => (f.cd[k] = Math.max(0, f.cd[k] - dt)));
    Object.keys(f.buffs).forEach((k) => (f.buffs[k] = Math.max(0, f.buffs[k] - dt)));

    // Estados persistentes (quemadura DoT, etc.).
    for (let i = f.statuses.length - 1; i >= 0; i--) {
      const s = f.statuses[i];
      s.until -= dt;
      if (s.id === "burn" && s.until > 0 && !this.interlude) {
        s.tick += dt;
        const interval = 0.5;
        while (s.tick >= interval) {
          s.tick -= interval;
          f.hp = Math.max(0, f.hp - (STATUS.burn.dps || 3) * interval);
        }
      }
      if (s.until <= 0) f.statuses.splice(i, 1);
    }
    if (f.hp <= 0 && f.alive) { this.ko(f, f.lastHitBy || this.other(f)); return; }

    if (f.freeze > 0) f.vx *= 0.25;

    // Gravedad con salto variable (mantener para saltar más alto).
    let g = GRAVITY;
    if (f.y > 0 && f.vy > 0) {
      g = f.upHold ? GRAVITY * 0.58 : GRAVITY * 1.25;
    }
    f.vy += g * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0;
      if (f.vy < 0) f.vy = 0;
    }
    f.x = Math.max(ARENA.minX, Math.min(ARENA.maxX, f.x));

    // Movimiento horizontal con aceleración (más natural que velocidad instantánea).
    const spd = f.spd();
    if (f.dashTime > 0) {
      // Preserve the dash impulse during its active frames, not ground friction.
    } else if (f.y <= 0) {
      const target = f.walkDir * WALK_SPEED * spd;
      const rate = f.walkDir !== 0 ? 1 - Math.exp(-GROUND_ACCEL * dt) : 1 - Math.exp(-GROUND_FRICTION * dt);
      f.vx += (target - f.vx) * rate;
      if (f.blocking) f.vx *= 0.4;
      if (f.crouch) f.vx = 0;
    } else {
      f.vx += f.walkDir * AIR_ACCEL * spd * dt;
      f.vx *= 1 - Math.min(1, AIR_DRAG * dt);
      f.vx = Math.max(-AIR_MAX * spd, Math.min(AIR_MAX * spd, f.vx));
    }

    f.chakra = Math.min(100, f.chakra + dt * 3.2);
    if (f.pendingSpec) {
      f.pendingSpec.delay -= dt;
      if (f.pendingSpec.delay <= 0) {
        const spec = f.pendingSpec.spec;
        f.pendingSpec = null;
        this.spawnSpec(f, spec);
      }
    }
    if (f.move && f.alive && !this.over) {
      const mv = f.move;
      if (f.timer >= mv.startup && previousTimer < mv.startup + mv.active) {
        this.tryHit(f, this.other(f), mv);
      }
    }
    f.ninja.update(dt, { flash: f.flash > 0, height: f.y });
    f.sync();
  }

  stepProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.over) return;
      const p = this.projectiles[i];
      p.life -= dt;
      const previousX = p.x;
      p.x += p.vx * dt;
      const def = this.other(p.owner);
      if (def.x >= Math.min(previousX, p.x) - 0.55 - (p.size || 0.3) && def.x <= Math.max(previousX, p.x) + 0.55 + (p.size || 0.3) && Math.abs(p.y - (def.y + 1.1)) < 0.7 && def.invuln <= 0) {
        const blocked = def.blocking && def.facing !== Math.sign(p.vx);
        this.applyHit(def, p.owner, p.damage, p.hitstun, p.knock, blocked, p.chip, p.statuses);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.x < ARENA.minX - 2 || p.x > ARENA.maxX + 2) this.projectiles.splice(i, 1);
    }
    for (let i = this.traps.length - 1; i >= 0; i--) {
      if (this.over) return;
      const t = this.traps[i];
      t.age += dt;
      const def = this.other(t.owner);
      if (t.age > 0.18 && Math.abs(def.x - t.x) < 0.7 && def.y < 0.4) {
        this.applyHit(def, t.owner, t.damage, t.hitstun, 3.2, false, 2, t.statuses);
        this.traps.splice(i, 1);
        continue;
      }
      if (t.age > t.life) this.traps.splice(i, 1);
    }
  }

  stepPickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.bob += dt;
      const owner = this.pickupCollector;
      if (owner.alive && Math.abs(owner.x - p.x) < 0.62 && owner.y < 0.7 && p.y < 0.7) {
        this.applyPickup(owner, p);
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.pickups.splice(i, 1);
    }
  }

  update(dt) {
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt);
      this.p1.sync(); this.p2.sync();
      this.p1.ninja.update(dt, {}); this.p2.ninja.update(dt, {});
      return;
    }
    if (this.hitstop > 0) { this.hitstop = Math.max(0, this.hitstop - dt); return; }
    if (this.over && !this.interlude) {
      this.p1.ninja.update(dt, {}); this.p2.ninja.update(dt, {});
      return;
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) { this.combo = 0; this.comboOwner = null; }
    if (this.interlude) {
      this.projectiles.length = 0; this.traps.length = 0;
      this.physics(this.p1, dt); this.physics(this.p2, dt);
      this.stepPickups(dt);
      return;
    }
    this.time = Math.max(0, this.time - dt);
    if (this.time <= 0) {
      this.over = true;
      this.winner = this.p1.hp / this.p1.maxHp >= this.p2.hp / this.p2.maxHp ? this.p1 : this.p2;
      this.winner.ninja.animator.play("win", 3, true);
      this.onEvent({ type: "timeout", winner: this.winner });
      return;
    }
    this.face();
    this.physics(this.p1, dt);
    if (!this.over) this.physics(this.p2, dt);
    if (!this.over) this.stepProjectiles(dt);
    this.stepPickups(dt);
    const left = this.p1.x <= this.p2.x ? this.p1 : this.p2;
    const right = this.other(left);
    const gap = right.x - left.x;
    if (gap < 0.6 && left.y < 0.3 && right.y < 0.3 && !this.over) {
      const push = (0.6 - gap) / 2;
      left.x = Math.max(ARENA.minX, left.x - push);
      right.x = Math.min(ARENA.maxX, right.x + push);
      if (right.x - left.x < 0.6) {
        if (left.x === ARENA.minX) right.x = left.x + 0.6;
        else left.x = right.x - 0.6;
      }
    }
    this.p1.sync(); this.p2.sync();
  }
}
