// src/systems/CombatSystem.js
// Sistema de Resolução de Colisões, Hitboxes, Contra (Parry), Combos e Feedback de Impacto

import { COMBAT } from './CombatConstants.js';
import AudioSynth from './AudioSynth.js';

export default class CombatSystem {
  /**
   * Resolve o impacto de um ataque entre atacante e defensor.
   * @param {Fighter} attacker 
   * @param {Fighter} defender 
   * @param {Object} attackData 
   * @param {Phaser.Scene} scene 
   * @returns {Object} { hit, blocked, countered }
   */
  static resolve(attacker, defender, attackData, scene) {
    if (!attacker || !defender || !attackData) {
      return { hit: false, blocked: false, countered: false };
    }

    // Não acertar quem já está em KO
    if (defender.state === 'KO') {
      return { hit: false, blocked: false, countered: false };
    }

    // 1. CHECAGEM DO SISTEMA DE CONTRA (PARRY POR TIMING)
    // Regra: se defensor está em BLOCK dentro da janela de 4 frames (counterWindowCounter > 0)
    // E possui ao menos 25 de energia (COUNTER_METER_COST), e o golpe não é um agarrão puro
    if (
      defender.counterWindowCounter > 0 &&
      defender.meter >= COMBAT.COUNTER_METER_COST &&
      !attackData.isThrow
    ) {
      // Consome os 25 de energia do defensor
      defender.meter -= COMBAT.COUNTER_METER_COST;
      defender.triggerCounterSuccess();

      // Cancela todo o dano e aplica contra-stun no atacante
      attacker.state = 'HIT_STUN';
      attacker.hitstunFrames = COMBAT.COUNTER_STUN_FRAMES;
      attacker.currentAttackId = null;
      attacker.currentAttackData = null;
      attacker.hasHitThisAttack = false;

      // Feedback audiovisual do Contra
      this.applyHitstop(scene, COMBAT.HITSTOP_MS.super);
      this.applyScreenshake(scene, 8, 120);
      this.spawnParrySpark(scene, (attacker.container.x + defender.container.x) / 2, defender.container.y - 45);

      scene.events.emit('counter', { attacker, defender });
      return { hit: false, blocked: false, countered: true };
    }

    // 2. CHECAGEM DE DEFESA COMUM (BLOCK)
    const isDefending = defender.state === 'BLOCK' && !attackData.isThrow;

    if (isDefending) {
      // Dano de chip (arranhão) se o golpe tiver chipPercent
      const chipPercent = attackData.chipPercent || 0.15;
      const chipDamage = Math.max(1, Math.round(attackData.damage * chipPercent));
      const blockstun = attackData.blockstun || 10;
      const pushback = attackData.pushback || 20;

      defender.takeHit(chipDamage, blockstun, pushback, true, attacker);

      // Ganho de energia do atacante no bloqueio
      const meterGain = attackData.meterGain ? attackData.meterGain.onBlock : 4;
      attacker.meter = Math.min(attacker.maxMeter, attacker.meter + meterGain);

      // SFX e Hitstop leve de defesa
      AudioSynth.play('block');
      this.applyHitstop(scene, COMBAT.HITSTOP_MS.light);
      this.spawnBlockSparks(scene, (attacker.container.x + defender.container.x) / 2, defender.container.y - 40);

      scene.events.emit('block', { attacker, defender, damage: chipDamage });
      return { hit: true, blocked: true, countered: false };
    }

    // 3. ACERTO LIMPO (HIT) COM SCALING DE COMBO
    // Incrementar combo tracker do atacante
    attacker.comboCount = (attacker.comboCount || 0) + 1;
    const comboIndex = Math.min(attacker.comboCount - 1, COMBAT.COMBO_SCALING.length - 1);
    const scaling = COMBAT.COMBO_SCALING[comboIndex];

    const rawDamage = Math.round(attackData.damage * scaling);
    const hitstun = attackData.hitstun || 14;
    const pushback = attackData.pushback || 25;

    const hitResult = defender.takeHit(rawDamage, hitstun, pushback, false, attacker);

    // Ganho de energia do atacante no acerto limpo
    const meterGain = attackData.meterGain ? attackData.meterGain.onHit : 8;
    attacker.meter = Math.min(attacker.maxMeter, attacker.meter + meterGain);

    // Determinar tempo de Hitstop pelo peso do golpe
    let hitstopDuration = COMBAT.HITSTOP_MS.medium;
    if (attackData.damage <= 5) {
      hitstopDuration = COMBAT.HITSTOP_MS.light; // 60ms
    } else if (attackData.damage >= 14 || attackData.isThrow) {
      hitstopDuration = COMBAT.HITSTOP_MS.heavy; // 100ms
    }

    // Feedbacks obrigatórios de impacto:
    this.applyHitstop(scene, hitstopDuration);
    this.applyFlash(scene, 1);
    this.applyScreenshake(scene, attackData.damage >= 12 ? 6 : 3, 90);
    this.spawnHitParticles(scene, (attacker.container.x + defender.container.x) / 2, defender.container.y - 45);

    scene.events.emit('hit', {
      attacker,
      defender,
      damage: hitResult.finalDamage || rawDamage,
      comboCount: attacker.comboCount,
      isArmor: hitResult.absorbedByArmor,
    });

    return { hit: true, blocked: false, countered: false };
  }

  /**
   * Aplica Hitstop congelando temporariamente a simulação de combate.
   */
  static applyHitstop(scene, durationMs) {
    if (!scene || scene.isHitstopping) return;
    scene.isHitstopping = true;

    // Reduzir ou pausar física por N milissegundos
    const prevTimeScale = scene.time.timeScale;
    scene.physics.world.isPaused = true;

    scene.time.delayedCall(durationMs, () => {
      scene.physics.world.isPaused = false;
      scene.time.timeScale = prevTimeScale;
      scene.isHitstopping = false;
    });
  }

  /**
   * Flash de 1 frame na tela no momento do impacto.
   */
  static applyFlash(scene, frames = 1) {
    if (!scene || !scene.cameras || !scene.cameras.main) return;
    scene.cameras.main.flash(frames * 16, 255, 255, 255);
  }

  /**
   * Screenshake leve e preciso em pixels.
   */
  static applyScreenshake(scene, intensity = 4, durationMs = 80) {
    if (!scene || !scene.cameras || !scene.cameras.main) return;
    scene.cameras.main.shake(durationMs, intensity * 0.002);
  }

  /**
   * Partículas em pixel de impacto.
   */
  static spawnHitParticles(scene, x, y) {
    if (!scene) return;
    for (let i = 0; i < 7; i++) {
      const p = scene.add.rectangle(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-8, 8),
        4, 4,
        0xFFFFFF
      );
      scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-25, 25),
        y: p.y + Phaser.Math.Between(-25, 25),
        alpha: 0,
        duration: 150,
        onComplete: () => p.destroy(),
      });
    }
  }

  /**
   * Centelhas de defesa em pixel.
   */
  static spawnBlockSparks(scene, x, y) {
    if (!scene) return;
    for (let i = 0; i < 5; i++) {
      const p = scene.add.rectangle(x, y, 3, 3, 0x4A90C2);
      scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-15, 15),
        y: p.y + Phaser.Math.Between(-15, 15),
        alpha: 0,
        duration: 120,
        onComplete: () => p.destroy(),
      });
    }
  }

  /**
   * Centelha dourada do Contra/Parry.
   */
  static spawnParrySpark(scene, x, y) {
    if (!scene) return;
    const ring = scene.add.circle(x, y, 12, 0xE8B33A, 0.9);
    scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });
  }
}
