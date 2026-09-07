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
      const plan = { axis: 0, jump: false, down: false, light: false, heavy: false, kick: false, special1: false, special2: false, ultimate: false, block: false, dash: false, evade: false, grab: false };
      if (err) {
        plan.axis = Math.random() > 0.5 ? 1 : -1;
        this.plan = plan;
        return this.plan;
      }
      // Si oponente ataca cerca, decide entre bloquear o esquivar (VF style)
      const oppAttacking = opp.state && ["light", "heavy", "kick", "special", "ultimate", "grab", "grabCombo"].includes(opp.state);
      if (oppAttacking && dist < 2.4) {
        if (Math.random() < d.block * 0.65) {
          plan.block = true;
          plan.axis = -dir;
        } else if (Math.random() < 0.42) {
          plan.evade = true;
          plan.axis = -dir;
        }
      } else if (opp.state === "grab" && dist < 1.6) {
        // Intentar romper agarre con evade o propio agarre
        if (Math.random() < 0.55) plan.evade = true;
        else if (Math.random() < 0.25) plan.grab = true;
      } else if (dist > 5.2) {
        plan.axis = dir;
        if (Math.random() < d.special) plan.special1 = true;
        if (boss && Math.random() < 0.28) plan.dash = true;
        if (!boss && Math.random() < 0.18) plan.evade = true;
      } else if (dist > 2.6) {
        plan.axis = dir;
        if (Math.random() < 0.28) plan.kick = true;
        else if (Math.random() < d.special) plan.special2 = true;
        else if (Math.random() < 0.22) plan.jump = true;
        else if (Math.random() < 0.12) plan.evade = true;
      } else if (dist > 1.45) {
        plan.axis = dir * 0.8;
        if (Math.random() < 0.18) plan.grab = true;
        else if (Math.random() < 0.30) plan.kick = true;
        else if (Math.random() < 0.22) plan.heavy = true;
        else if (Math.random() < 0.15) plan.evade = true;
      } else {
        // Cuerpo a cuerpo — VF: mucho grab y evade
        if (Math.random() < 0.10) plan.down = true;
        const r = Math.random();
        if (r < 0.22) plan.light = true;
        else if (r < 0.36) plan.heavy = true;
        else if (r < 0.50) plan.kick = true;
        else if (r < 0.62) plan.grab = true;
        else if (r < 0.62 + d.special * 0.7) plan.special1 = true;
        else if (boss && me.chakra > 88) plan.ultimate = true;
        else if (Math.random() < d.block * 0.5) plan.block = true;
        else if (Math.random() < 0.18) plan.evade = true;
        if (dist < 0.9 && Math.random() < 0.22) plan.axis = -dir;
        else plan.axis = dir * (Math.random() < 0.65 ? 1 : 0);
      }
      if (boss && me.hp < me.maxHp * 0.42 && Math.random() < 0.38) {
        plan.special1 = true;
        plan.evade = true;
      }
      // Robots con poca vida intentan esquivar más
      if (!boss && me.hp < me.maxHp * 0.35 && Math.random() < 0.32) {
        plan.evade = true;
        plan.block = false;
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
      out.evade = this.pulse.evade;
      out.grab = this.pulse.grab;
      this.pulse = null;
    } else {
      out.light = out.heavy = out.kick = false;
      out.special1 = out.special2 = out.ultimate = false;
      out.jump = out.dash = out.evade = out.grab = false;
    }
    return out;
  }
}
