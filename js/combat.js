import { ARENA, ELEMENTS, MOVES, fusionUltimate } from "./config.js";

const GRAVITY = -38;

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
    this.cd = { special1: 0, special2: 0, ultimate: 0 };
    this.combo = 0;
    this.air = false;
    this.crouch = false;
    this.blocking = false;
    this.alive = true;
    this.move = null;
    this.attackHit = false;
    this.elements = ninja.appearance.elements || ["fire", "wind"];
    this.name = ninja.appearance.name || "Shinobi";
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
    this.time = opts.time ?? 99;
    this.over = false;
    this.winner = null;
    this.hitstop = 0;
    this.intro = 1.6;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboRank = "";
    this.events = [];
    this.shake = 0;
    this.onEvent = opts.onEvent || (() => {});
  }

  other(f) {
    return f === this.p1 ? this.p2 : this.p1;
  }

  face() {
    if (this.p1.x <= this.p2.x) {
      if (this.p1.state !== "hurt" && this.p1.alive) this.p1.facing = 1;
      if (this.p2.state !== "hurt" && this.p2.alive) this.p2.facing = -1;
    } else {
      if (this.p1.alive) this.p1.facing = -1;
      if (this.p2.alive) this.p2.facing = 1;
    }
  }

  canAct(f) {
    return f.alive && f.hitstun <= 0 && f.blockstun <= 0 && f.freeze <= 0 && f.animLock <= 0 && !this.over && this.intro <= 0;
  }

  startMove(f, id) {
    const mv = MOVES[id];
    if (!mv) return;
    f.state = id;
    f.move = { ...mv, id };
    f.timer = 0;
    f.animLock = mv.startup + mv.active + mv.recovery;
    f.attackHit = false;
    f.ninja.animator.play(id, f.animLock);
  }

  special(f, which) {
    const spec = which === 1 ? f.el1.special : which === 2 ? f.el2.special : f.ult;
    const key = which === 3 ? "ultimate" : which === 1 ? "special1" : "special2";
    if (f.cd[key] > 0) return;
    const cost = spec.chakra ?? 24;
    if (f.chakra < cost) return;
    f.chakra -= cost;
    f.cd[key] = spec.cooldown ?? 1.2;
    f.state = which === 3 ? "ultimate" : "special";
    f.animLock = which === 3 ? 0.7 : 0.45;
    f.timer = 0;
    f.pendingSpec = { spec, delay: which === 3 ? 0.28 : 0.16 };
    f.ninja.animator.play(f.state, f.animLock);
    this.onEvent({ type: "special", fighter: f, spec });
  }

  spawnSpec(f, spec) {
    if (!f.alive || this.over) return;
    const opp = this.other(f);
    const color = spec.color || (ELEMENTS[f.elements[0]]?.color ?? "#fff");
    if (spec.type === "projectile") {
      this.projectiles.push({
        x: f.x + f.facing * 0.8,
        y: f.y + 1.15,
        vx: (spec.speed || 11) * f.facing,
        owner: f,
        damage: spec.damage * f.dmgMul,
        size: spec.size || 0.35,
        hitstun: spec.hitstun || 0.35,
        freeze: spec.freeze || 0,
        life: 1.6,
        color,
        ultimate: !!spec.ultimate,
      });
    } else if (spec.type === "dash") {
      f.vx = (spec.speed || 14) * f.facing;
      f.invuln = 0.12;
      f.state = "dash";
      this.tryHit(f, opp, {
        damage: spec.damage * f.dmgMul,
        hitstun: spec.hitstun || 0.45,
        knock: 4,
        range: 1.7,
        height: 1.4,
        chip: 3,
      });
    } else if (spec.type === "trap") {
      this.traps.push({
        x: opp.x,
        y: 0,
        owner: f,
        damage: spec.damage * f.dmgMul,
        hitstun: spec.hitstun || 0.5,
        age: 0,
        life: 0.55,
        color,
      });
    } else if (spec.type === "bind") {
      if (Math.abs(opp.x - f.x) < 4.5 && opp.y < 1.4) {
        this.applyHit(opp, f, spec.damage * f.dmgMul, spec.hitstun || 0.8, 0.5, false);
        opp.freeze = Math.max(opp.freeze, 0.45);
      }
    } else if (spec.type === "melee") {
      this.tryHit(f, opp, {
        damage: spec.damage * f.dmgMul,
        hitstun: spec.hitstun || 0.5,
        knock: 3.4,
        range: spec.range || 2.2,
        height: 1.4,
        chip: 3,
      });
    }
  }

  tryHit(atk, def, mv) {
    if (atk.attackHit) return false;
    const dx = (def.x - atk.x) * atk.facing;
    const dy = Math.abs(def.y - atk.y);
    if (dx > 0.15 && dx < mv.range && dy < mv.height) {
      atk.attackHit = true;
      const blocked = def.blocking && def.hitstun <= 0 && def.facing === -atk.facing;
      this.applyHit(def, atk, mv.damage, mv.hitstun, mv.knock, blocked, mv.chip);
      return true;
    }
    return false;
  }

  applyHit(def, atk, damage, hitstun, knock, blocked, chip = 1) {
    if (def.invuln > 0 || !def.alive) return;
    if (blocked) {
      def.hp = Math.max(1, def.hp - chip);
      def.blockstun = 0.18;
      def.vx = def.facing * -1.2;
      def.chakra = Math.min(100, def.chakra + 3);
      atk.chakra = Math.min(100, atk.chakra + 2);
      this.onEvent({ type: "block", atk, def });
      this.hitstop = 0.04;
      return;
    }
    const scaled = damage * (1 - Math.min(0.45, this.combo * 0.06));
    def.hp = Math.max(0, def.hp - scaled);
    def.hitstun = hitstun;
    def.state = "hurt";
    def.animLock = hitstun;
    def.ninja.animator.play("hurt", hitstun);
    def.vx = atk.facing * knock;
    def.vy = def.y > 0 ? 2.5 : 1.2;
    def.crouch = false;
    atk.chakra = Math.min(100, atk.chakra + 8);
    this.combo += 1;
    this.comboTimer = 1.1;
    this.comboRank = this.combo > 10 ? "HOKAGE" : this.combo > 7 ? "SHINOBI" : this.combo > 4 ? "GREAT" : "GOOD";
    this.hitstop = atk.state === "ultimate" ? 0.14 : 0.055;
    this.shake = 0.18 + Math.min(0.25, scaled * 0.01);
    this.onEvent({ type: "hit", atk, def, damage: scaled, x: def.x, y: def.y + 1.2 });
    if (def.hp <= 0) this.ko(def, atk);
  }

  ko(def, atk) {
    def.alive = false;
    def.hp = 0;
    def.state = "ko";
    def.ninja.animator.play("ko", 3);
    atk.ninja.animator.play("win", 3);
    this.over = true;
    this.winner = atk;
    this.onEvent({ type: "ko", winner: atk, loser: def });
  }

  control(f, input, dt = 0.016) {
    if (this.intro > 0 || this.over || !f.alive) return;
    if (f.hitstun > 0 || f.blockstun > 0 || f.freeze > 0) return;

    f.blocking = !!input.block && f.y <= 0 && f.animLock <= 0;
    f.crouch = !!input.down && f.y <= 0 && !f.blocking && f.animLock <= 0;
    const axis = input.axis || 0;

    if (f.y <= 0 && input.jump) {
      f.vy = 11.4;
      f.y = 0.02;
      f.ninja.animator.play("jump", 0);
      this.onEvent({ type: "jump", fighter: f });
    }

    if (input.dash && f.y <= 0) {
      f.vx = 10 * (axis || f.facing) * f.spdMul;
      f.state = "dash";
      f.animLock = 0.18;
      f.ninja.animator.play("dash", 0.18);
      f.invuln = 0.08;
    }

    if (f.animLock <= 0) {
      if (input.ultimate) this.special(f, 3);
      else if (input.special2) this.special(f, 2);
      else if (input.special1) this.special(f, 1);
      else if (input.kick) this.startMove(f, f.y > 0.2 ? "airKick" : "kick");
      else if (input.heavy) this.startMove(f, "heavy");
      else if (input.light) this.startMove(f, f.crouch ? "crouchLight" : "light");
    }

    if (f.animLock <= 0 && f.y <= 0) {
      if (f.blocking) {
        f.state = "block";
        f.vx *= 0.4;
        f.ninja.animator.play("block");
      } else if (f.crouch) {
        f.state = "crouch";
        f.vx = 0;
        f.ninja.animator.play("crouch");
      } else if (axis) {
        f.vx = axis * 4.3 * f.spdMul;
        f.state = "walk";
        f.ninja.animator.play("walk");
      } else {
        f.vx *= 0.7;
        f.state = "idle";
        f.ninja.animator.play("idle");
      }
    } else if (f.animLock <= 0 && f.y > 0) {
      f.vx += axis * 8 * dt;
      f.ninja.animator.play("jump");
    }
  }

  physics(f, dt) {
    f.timer += dt;
    f.animLock = Math.max(0, f.animLock - dt);
    f.hitstun = Math.max(0, f.hitstun - dt);
    f.blockstun = Math.max(0, f.blockstun - dt);
    f.invuln = Math.max(0, f.invuln - dt);
    f.freeze = Math.max(0, f.freeze - dt);
    Object.keys(f.cd).forEach((k) => (f.cd[k] = Math.max(0, f.cd[k] - dt)));
    if (f.freeze > 0) {
      f.vx *= 0.2;
    }
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0;
      if (f.vy < 0) f.vy = 0;
    }
    f.x = Math.max(ARENA.minX, Math.min(ARENA.maxX, f.x));
    f.vx *= f.y > 0 ? 0.98 : 0.82;
    f.chakra = Math.min(100, f.chakra + dt * 3.2);
    if (f.pendingSpec) {
      f.pendingSpec.delay -= dt;
      if (f.pendingSpec.delay <= 0) {
        const spec = f.pendingSpec.spec;
        f.pendingSpec = null;
        this.spawnSpec(f, spec);
      }
    }
    if (f.move && f.alive) {
      const mv = f.move;
      if (f.timer >= mv.startup && f.timer <= mv.startup + mv.active) {
        this.tryHit(f, this.other(f), mv);
      }
    }
    f.ninja.update(dt, {});
    f.sync();
  }

  stepProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      const def = this.other(p.owner);
      if (Math.abs(p.x - def.x) < 0.55 + (p.size || 0.3) && Math.abs(p.y - (def.y + 1.1)) < 0.7) {
        const blocked = def.blocking && def.facing !== Math.sign(p.vx);
        this.applyHit(def, p.owner, p.damage, p.hitstun, 2.4, blocked, 2);
        if (p.freeze && !blocked) def.freeze = p.freeze;
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.x < ARENA.minX - 2 || p.x > ARENA.maxX + 2) this.projectiles.splice(i, 1);
    }
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      t.age += dt;
      const def = this.other(t.owner);
      if (t.age > 0.18 && Math.abs(def.x - t.x) < 0.7 && def.y < 0.4) {
        this.applyHit(def, t.owner, t.damage, t.hitstun, 3.2, false, 2);
        this.traps.splice(i, 1);
        continue;
      }
      if (t.age > t.life) this.traps.splice(i, 1);
    }
  }

  update(dt) {
    if (this.intro > 0) {
      this.intro -= dt;
      this.p1.sync();
      this.p2.sync();
      this.p1.ninja.update(dt, {});
      this.p2.ninja.update(dt, {});
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    if (!this.over) this.time -= dt;
    if (this.time <= 0 && !this.over) {
      this.time = 0;
      this.over = true;
      this.winner = this.p1.hp >= this.p2.hp ? this.p1 : this.p2;
      this.onEvent({ type: "timeout", winner: this.winner });
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.face();
    this.physics(this.p1, dt);
    this.physics(this.p2, dt);
    this.stepProjectiles(dt);
    const gap = Math.abs(this.p1.x - this.p2.x);
    if (gap < 0.55 && this.p1.y < 0.3 && this.p2.y < 0.3) {
      const push = (0.55 - gap) / 2;
      if (this.p1.x < this.p2.x) {
        this.p1.x -= push;
        this.p2.x += push;
      } else {
        this.p1.x += push;
        this.p2.x -= push;
      }
    }
  }
}
