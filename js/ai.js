import { DIFFICULTY } from "./config.js";

export class AIController {
  constructor(fighter, match, difficulty = "normal", style = "grunt") {
    this.f = fighter;
    this.match = match;
    this.diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.style = style;
    this.think = 0;
    this.plan = { axis: 0 };
  }

  input(dt) {
    this.think -= dt;
    const me = this.f;
    const opp = this.match.other(me);
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx) || 1;
    const d = this.diff;
    const boss = this.style === "boss";

    if (this.think <= 0) {
      this.think = d.react * (0.6 + Math.random() * 0.8);
      const err = Math.random() < d.err;
      const plan = { axis: 0, jump: false, down: false, light: false, heavy: false, kick: false, special1: false, special2: false, ultimate: false, block: false, dash: false };
      if (err) {
        plan.axis = Math.random() > 0.5 ? 1 : -1;
        this.plan = plan;
        return this.plan;
      }
      if (opp.state && ["light", "heavy", "kick", "special", "ultimate"].includes(opp.state) && Math.random() < d.block) {
        plan.block = true;
        plan.axis = -dir;
      } else if (dist > 4.2) {
        plan.axis = dir;
        if (Math.random() < d.special) plan.special1 = true;
        if (boss && Math.random() < 0.25) plan.dash = true;
      } else if (dist > 2.2) {
        plan.axis = dir;
        if (Math.random() < 0.35) plan.kick = true;
        else if (Math.random() < d.special) plan.special2 = true;
        else if (Math.random() < 0.3) plan.jump = true;
      } else {
        if (Math.random() < 0.12) plan.down = true;
        const r = Math.random();
        if (r < 0.28) plan.light = true;
        else if (r < 0.48) plan.heavy = true;
        else if (r < 0.66) plan.kick = true;
        else if (r < 0.66 + d.special) plan.special1 = true;
        else if (boss && me.chakra > 90) plan.ultimate = true;
        else plan.block = Math.random() < d.block;
        if (dist < 0.9 && Math.random() < 0.2) plan.axis = -dir;
        else plan.axis = dir * (Math.random() < 0.7 ? 1 : 0);
      }
      if (boss && me.hp < me.maxHp * 0.45 && Math.random() < 0.35) {
        plan.special1 = true;
        plan.dash = true;
      }
      this.plan = plan;
      this.pulse = { ...plan };
    }
    const out = { ...this.plan };
    if (this.pulse) {
      out.light = this.pulse.light;
      out.heavy = this.pulse.heavy;
      out.kick = this.pulse.kick;
      out.special1 = this.pulse.special1;
      out.special2 = this.pulse.special2;
      out.ultimate = this.pulse.ultimate;
      out.jump = this.pulse.jump;
      out.dash = this.pulse.dash;
      this.pulse = null;
    } else {
      out.light = out.heavy = out.kick = false;
      out.special1 = out.special2 = out.ultimate = false;
      out.jump = out.dash = false;
    }
    return out;
  }
}
