// src/systems/CombatConstants.js
// Constantes globais do motor de combate do KUARAHY (Seção 8 da especificação)

export const COMBAT = {
  TICK_RATE: 60,
  ROUND_TIME: 60,
  ROUNDS_TO_WIN: 2,
  GRAVITY: 0.9,
  JUMP_VELOCITY: -18,
  WALK_FORWARD: 3.2,
  WALK_BACKWARD: 2.4,
  PUSHBOX: { w: 40, h: 88 },
  HITSTOP_MS: { light: 60, medium: 80, heavy: 100, super: 140 },
  COMBO_SCALING: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5],
  COUNTER_WINDOW_FRAMES: 4,
  COUNTER_STUN_FRAMES: 20,
  COUNTER_METER_COST: 25,
  MAX_HEALTH: 100,
  MAX_METER: 100,
  METER_GAIN_ON_TAKE_HIT: 3,
  METER_GAIN_ON_BLOCK: 2,
};
