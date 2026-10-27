// src/entities/Fighter.js
// Entidade de Lutador 2D do KUARAHY com Máquina de Estados Finitos (FSM) e Pixel Art Procedural

import { COMBAT } from '../systems/CombatConstants.js';
import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export const FighterState = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  CROUCH: 'CROUCH',
  JUMP: 'JUMP',
  ATTACK: 'ATTACK',
  BLOCK: 'BLOCK',
  COUNTER: 'COUNTER',
  HIT_STUN: 'HIT_STUN',
  BLOCK_STUN: 'BLOCK_STUN',
  KO: 'KO',
};

export default class Fighter {
  constructor(scene, x, y, fighterData, playerIndex = 1) {
    this.scene = scene;
    this.data = fighterData;
    this.playerIndex = playerIndex; // 1 = P1, 2 = P2

    // Atributos de Combate
    this.maxHealth = COMBAT.MAX_HEALTH;
    this.health = this.maxHealth;
    this.maxMeter = COMBAT.MAX_METER;
    this.meter = 0;

    // FSM e Controles de Frame
    this.state = FighterState.IDLE;
    this.facing = playerIndex === 1 ? 1 : -1; // 1 = Direita, -1 = Esquerda
    this.frameCounter = 0;
    this.hitstunFrames = 0;
    this.blockstunFrames = 0;
    this.counterWindowCounter = 0; // Janela ativa de 4 frames para Contra/Parry
    this.counterStunCounter = 0;

    // Ataque ativo
    this.currentAttackId = null;
    this.currentAttackData = null;
    this.hasHitThisAttack = false;

    // Cooldowns de golpes especiais e Buffs de Super
    this.specialCooldowns = { special_1: 0, special_2: 0 };
    this.superActiveFrames = 0;
    this.armorHits = 0; // Armadura contra 1 acerto (específico de Chaco / Super do Guarani)

    // Criação física do corpo via Phaser Arcade Physics
    this.container = scene.add.container(x, y);
    scene.physics.world.enable(this.container);

    this.body = this.container.body;
    this.body.setSize(COMBAT.PUSHBOX.w, COMBAT.PUSHBOX.h);
    this.body.setOffset(-COMBAT.PUSHBOX.w / 2, -COMBAT.PUSHBOX.h);
    this.body.setCollideWorldBounds(true);

    // Gráficos de Renderização em Pixel Art (Neo Geo Style)
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);

    // Efeito visual de rastro de super
    this.afterImageGraphics = scene.add.graphics();
    this.container.add(this.afterImageGraphics);

    // Cores e estilo
    this.mainColor = parseInt(this.data.color.replace('#', '0x'), 16);
    this.skinColor = 0xF2C29B; // --pele-clara
    this.skinShadow = 0xC98B62; // --pele-sombra
    this.goldColor = 0xE8B33A;

    // Spritesheet Real do Lutador (se carregado no Phaser)
    this.palette = playerIndex === 1 ? 'p1' : 'p2';
    this.isMirrorMatch = Boolean(scene.p1Data && scene.p2Data && scene.p1Data.id === scene.p2Data.id);
    const idleKey = `${this.data.id}_${this.palette}_idle`;
    this.hasSpriteSheet = scene.textures.exists(idleKey);

    if (this.hasSpriteSheet) {
      this.sprite = scene.add.sprite(0, -68, idleKey);
      this.sprite.setScale(0.70);
      this.sprite.setOrigin(0.5, 0.78);
      this.container.add(this.sprite);
      this.playAnimation('idle');
    }

    // Inicializar renderização visual
    // Indicador sobre a cabeca para diferenciar jogadores
    const isP1 = this.playerIndex === 1;
    this.overheadTag = scene.add.text(0, -112, isP1 ? 'P1' : (this.isMirrorMatch ? 'P2 (ALT)' : 'P2'), {
      fontFamily: 'monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: isP1 ? '#4A90C2' : (this.isMirrorMatch ? '#E8B33A' : '#C8102E'),
      stroke: '#0D0D12',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.container.add(this.overheadTag);

    this.applyDefaultTint();
    this.renderPixelArt(0);
  }

  reset(x, facing) {
    this.health = this.maxHealth;
    this.meter = 0;
    this.state = FighterState.IDLE;
    this.facing = facing;
    this.frameCounter = 0;
    this.hitstunFrames = 0;
    this.blockstunFrames = 0;
    this.counterWindowCounter = 0;
    this.counterStunCounter = 0;
    this.currentAttackId = null;
    this.currentAttackData = null;
    this.hasHitThisAttack = false;
    this.specialCooldowns = { special_1: 0, special_2: 0 };
    this.superActiveFrames = 0;
    this.armorHits = 0;

    this.container.setPosition(x, 430);
    this.body.setVelocity(0, 0);
    if (this.sprite) {
      this.applyDefaultTint();
      this.playAnimation('idle');
    }
    this.renderPixelArt(0);
  }

  update(delta, input, opponent) {
    // Reduzir cooldowns por tick
    if (this.specialCooldowns.special_1 > 0) this.specialCooldowns.special_1--;
    if (this.specialCooldowns.special_2 > 0) this.specialCooldowns.special_2--;
    if (this.superActiveFrames > 0) this.superActiveFrames--;
    if (this.counterWindowCounter > 0) this.counterWindowCounter--;

    // Orientar facing em direção ao oponente quando neutro no chão
    if (opponent && (this.state === FighterState.IDLE || this.state === FighterState.WALK || this.state === FighterState.CROUCH)) {
      if (this.container.x < opponent.container.x) {
        this.facing = 1;
      } else {
        this.facing = -1;
      }
    }

    if (this.sprite) {
      this.sprite.setFlipX(this.facing === -1);
    }

    // Processamento da Máquina de Estados (FSM)
    switch (this.state) {
      case FighterState.IDLE:
        this.handleIdleState(input);
        break;

      case FighterState.WALK:
        this.handleWalkState(input);
        break;

      case FighterState.CROUCH:
        this.handleCrouchState(input);
        break;

      case FighterState.JUMP:
        this.handleJumpState(input);
        break;

      case FighterState.ATTACK:
        this.handleAttackState(input);
        break;

      case FighterState.BLOCK:
        this.handleBlockState(input);
        break;

      case FighterState.COUNTER:
        this.handleCounterState();
        break;

      case FighterState.HIT_STUN:
        this.handleHitStunState();
        break;

      case FighterState.BLOCK_STUN:
        this.handleBlockStunState();
        break;

      case FighterState.KO:
        this.body.setVelocityX(0);
        break;

      default:
        this.state = FighterState.IDLE;
        break;
    }

    // Renderizar a silhueta em pixel art de acordo com o estado e tempo
    this.renderPixelArt(delta);
  }

  handleIdleState(input) {
    this.body.setVelocityX(0);

    // Ataques imediatos
    if (this.checkAttackInputs(input)) return;

    // Defesa / Contra
    if (input.block) {
      this.state = FighterState.BLOCK;
      // Inicia a janela de Contra (Parry) de 4 frames
      this.counterWindowCounter = COMBAT.COUNTER_WINDOW_FRAMES;
      return;
    }

    // Pulo
    if (input.up && this.body.blocked.down) {
      this.body.setVelocityY(COMBAT.JUMP_VELOCITY * 35);
      this.state = FighterState.JUMP;
      return;
    }

    // Agachamento
    if (input.down) {
      this.state = FighterState.CROUCH;
      return;
    }

    // Caminhada
    if (input.left || input.right) {
      this.state = FighterState.WALK;
    }
  }

  handleWalkState(input) {
    if (this.checkAttackInputs(input)) return;

    if (input.block) {
      this.state = FighterState.BLOCK;
      this.counterWindowCounter = COMBAT.COUNTER_WINDOW_FRAMES;
      this.body.setVelocityX(0);
      return;
    }

    if (input.up && this.body.blocked.down) {
      this.body.setVelocityY(COMBAT.JUMP_VELOCITY * 35);
      this.state = FighterState.JUMP;
      return;
    }

    if (input.down) {
      this.state = FighterState.CROUCH;
      this.body.setVelocityX(0);
      return;
    }

    // Velocidade base modificada pelo stat de speed do lutador
    const speedMult = 0.8 + (this.data.stats.speed * 0.12);
    const superSpeed = this.superActiveFrames > 0 && this.data.id === 'nanduti' ? 1.5 : 1.0;

    if (input.right) {
      const walkSpeed = (this.facing === 1 ? COMBAT.WALK_FORWARD : COMBAT.WALK_BACKWARD) * 55 * speedMult * superSpeed;
      this.body.setVelocityX(walkSpeed);
    } else if (input.left) {
      const walkSpeed = (this.facing === -1 ? COMBAT.WALK_FORWARD : COMBAT.WALK_BACKWARD) * -55 * speedMult * superSpeed;
      this.body.setVelocityX(walkSpeed);
    } else {
      this.state = FighterState.IDLE;
      this.body.setVelocityX(0);
    }
  }

  handleCrouchState(input) {
    this.body.setVelocityX(0);

    if (this.checkAttackInputs(input, true)) return;

    if (!input.down) {
      this.state = FighterState.IDLE;
      return;
    }

    if (input.block) {
      this.state = FighterState.BLOCK;
      this.counterWindowCounter = COMBAT.COUNTER_WINDOW_FRAMES;
    }
  }

  handleJumpState(input) {
    this.checkAttackInputs(input, false, true);

    if (this.body.blocked.down) {
      this.state = FighterState.IDLE;
      this.body.setVelocityX(0);
    }
  }

  handleAttackState(input) {
    this.frameCounter++;
    const atk = this.currentAttackData;
    if (!atk) {
      this.state = FighterState.IDLE;
      return;
    }

    // Tereré Super: reduz o recovery pela metade nos golpes normais
    let recoveryTime = atk.recovery;
    if (this.superActiveFrames > 0 && (this.data.id === 'terere' || this.data.id === 'terere_master') && !atk.id) {
      recoveryTime = Math.ceil(atk.recovery * 0.5);
    }

    const totalFrames = atk.startup + atk.active + recoveryTime;

    // Checagem de cancelamento durante o golpe (combos)
    if (this.hasHitThisAttack && atk.cancelInto && atk.cancelInto.length > 0) {
      for (const targetAttack of atk.cancelInto) {
        if (targetAttack === 'heavy_punch' && input.punchHeavy) {
          this.executeAttack('heavy_punch');
          return;
        }
        if (targetAttack === 'heavy_kick' && input.kickHeavy) {
          this.executeAttack('heavy_kick');
          return;
        }
        if (targetAttack === 'special_1' && input.special1) {
          this.executeAttack('special_1');
          return;
        }
        if (targetAttack === 'special_2' && input.special2) {
          this.executeAttack('special_2');
          return;
        }
      }
    }

    if (this.frameCounter >= totalFrames) {
      this.state = this.body.blocked.down ? FighterState.IDLE : FighterState.JUMP;
      this.currentAttackId = null;
      this.currentAttackData = null;
      this.hasHitThisAttack = false;
      this.frameCounter = 0;
    }
  }

  handleBlockState(input) {
    this.body.setVelocityX(0);

    // Se soltar o botão de defesa, volta para Idle ou Crouch
    if (!input.block) {
      this.state = input.down ? FighterState.CROUCH : FighterState.IDLE;
    }
  }

  handleCounterState() {
    this.counterStunCounter--;
    this.body.setVelocityX(0);
    if (this.counterStunCounter <= 0) {
      this.state = FighterState.IDLE;
    }
  }

  handleHitStunState() {
    this.hitstunFrames--;
    if (this.hitstunFrames <= 0) {
      this.state = this.body.blocked.down ? FighterState.IDLE : FighterState.JUMP;
    }
  }

  handleBlockStunState() {
    this.blockstunFrames--;
    if (this.blockstunFrames <= 0) {
      this.state = FighterState.BLOCK;
    }
  }

  checkAttackInputs(input, isCrouching = false, isAir = false) {
    // 1. Super golpe (Requer 100 de energia)
    if (input.superMove && this.meter >= 100) {
      this.meter = 0;
      this.executeSuper();
      return true;
    }

    // 2. Agarrão (U ou Num4)
    if (input.throw) {
      this.executeThrow();
      return true;
    }

    // 3. Especiais (Cooldown ou Custo)
    if (input.special1 && this.specialCooldowns.special_1 <= 0) {
      this.executeAttack('special_1');
      return true;
    }

    if (input.special2 && this.specialCooldowns.special_2 <= 0) {
      this.executeAttack('special_2');
      return true;
    }

    // 4. Normais no Ar
    if (isAir) {
      if (input.punch || input.kick) {
        this.executeAttack('air_attack');
        return true;
      }
      return false;
    }

    // 5. Normais Agachado
    if (isCrouching) {
      if (input.punch || input.kick) {
        this.executeAttack('crouch_attack');
        return true;
      }
      return false;
    }

    // 6. Normais em Pé
    if (input.punchHeavy) {
      this.executeAttack('heavy_punch');
      return true;
    }
    if (input.punch) {
      this.executeAttack('light_punch');
      return true;
    }
    if (input.kickHeavy) {
      this.executeAttack('heavy_kick');
      return true;
    }
    if (input.kick) {
      this.executeAttack('light_kick');
      return true;
    }

    return false;
  }

  executeAttack(attackKey) {
    let attackData = null;
    if (this.data.normals[attackKey]) {
      attackData = this.data.normals[attackKey];
    } else if (this.data.specials[attackKey]) {
      attackData = this.data.specials[attackKey];
      // Definir cooldown para especiais
      this.specialCooldowns[attackKey] = attackData.cooldownFrames || 90;

      // Se for Chaco especial 1, ganha 1 hit de armadura
      if (this.data.id === 'chaco' && attackKey === 'special_1') {
        this.armorHits = 1;
      }
    }

    if (!attackData) return;

    this.state = FighterState.ATTACK;
    this.currentAttackId = attackKey;
    this.currentAttackData = attackData;
    this.frameCounter = 0;
    this.hasHitThisAttack = false;

    // Tocar a animacao do ataque imediatamente
    if (attackKey === 'special_1') {
      this.playAnimation('special_1', true);
    } else if (attackKey === 'special_2') {
      this.playAnimation('special_2', true);
    } else if (attackKey === 'heavy_punch') {
      this.playAnimation('heavy_punch', true);
    } else if (attackKey === 'light_kick') {
      this.playAnimation('light_kick', true);
    } else if (attackKey === 'heavy_kick') {
      this.playAnimation('heavy_kick', true);
    } else if (attackKey === 'crouch_attack') {
      this.playAnimation('crouch', true);
    } else if (attackKey === 'air_attack') {
      this.playAnimation('jump', true);
    } else {
      this.playAnimation('light_punch', true);
    }

    // SFX do Golpe
    if (attackData.sfx) {
      AudioSynth.play(attackData.sfx);
    }
  }

  executeSuper() {
    this.superActiveFrames = this.data.super.durationFrames || 180;
    AudioSynth.play('super_activate');

    if (this.data.id === 'guarani') {
      this.armorHits = 1;
    }

    this.state = FighterState.ATTACK;
    this.currentAttackId = 'super';
    this.currentAttackData = this.data.super;
    this.frameCounter = 0;
    this.hasHitThisAttack = false;
    this.playAnimation('super_attack', true);

    this.scene.cameras.main.flash(120, 232, 179, 58);
  }

  executeThrow() {
    // Agarrão funcional de curto alcance (ignora defesa comum)
    const throwData = {
      startup: 4,
      active: 3,
      recovery: 15,
      damage: 12,
      hitstun: 25,
      blockstun: 25,
      isThrow: true,
      hitbox: { x: 30, y: -10, w: 26, h: 40 },
      meterGain: { onHit: 10, onBlock: 0, onWhiff: 0 },
      sfx: 'punch_heavy',
    };

    this.state = FighterState.ATTACK;
    this.currentAttackId = 'throw';
    this.currentAttackData = throwData;
    this.frameCounter = 0;
    this.hasHitThisAttack = false;
    AudioSynth.play('punch_heavy');
  }

  getActiveHitbox() {
    if (this.state !== FighterState.ATTACK || !this.currentAttackData) return null;

    const atk = this.currentAttackData;
    // Hitbox só está ativa durante os frames de [startup, startup + active]
    if (this.frameCounter >= atk.startup && this.frameCounter < (atk.startup + atk.active)) {
      const box = atk.hitbox;
      return {
        x: this.container.x + (box.x * this.facing) - (this.facing === -1 ? box.w : 0),
        y: this.container.y + box.y,
        w: box.w,
        h: box.h,
        data: atk,
      };
    }
    return null;
  }

  getHurtbox() {
    const isCrouching = this.state === FighterState.CROUCH;
    const h = isCrouching ? COMBAT.PUSHBOX.h * 0.65 : COMBAT.PUSHBOX.h;
    return {
      x: this.container.x - COMBAT.PUSHBOX.w / 2,
      y: this.container.y - h,
      w: COMBAT.PUSHBOX.w,
      h: h,
    };
  }

  takeHit(damage, hitstun, pushback = 20, isBlocked = false, attacker = null) {
    // 1. Armadura ativa (Guarani Super ou Chaco Especial)
    if (this.armorHits > 0 && !isBlocked) {
      this.armorHits--;
      AudioSynth.play('block');
      this.meter = Math.min(this.maxMeter, this.meter + 10);
      // Reduz o dano em 50% e não sofre hitstun!
      this.health = Math.max(0, this.health - Math.floor(damage * 0.5));
      return { absorbedByArmor: true };
    }

    // Redução de dano por stat de defesa do lutador (entre 2 e 5)
    const defFactor = 1.0 - ((this.data.stats.defense - 2) * 0.05);
    const finalDamage = Math.max(1, Math.round(damage * defFactor));

    this.health = Math.max(0, this.health - finalDamage);

    // Ganho de energia ao levar golpe / bloquear
    if (isBlocked) {
      this.meter = Math.min(this.maxMeter, this.meter + COMBAT.METER_GAIN_ON_BLOCK);
      this.state = FighterState.BLOCK_STUN;
      this.blockstunFrames = hitstun;
    } else {
      this.meter = Math.min(this.maxMeter, this.meter + COMBAT.METER_GAIN_ON_TAKE_HIT);
      this.state = FighterState.HIT_STUN;
      this.hitstunFrames = hitstun;
    }

    // Empurrão (Pushback)
    const pushDir = attacker ? (this.container.x > attacker.container.x ? 1 : -1) : -this.facing;
    this.body.setVelocityX(pushDir * pushback * 18);

    if (this.health <= 0) {
      this.state = FighterState.KO;
      this.body.setVelocityY(-200);
      AudioSynth.play('ko');
    }

    return { absorbedByArmor: false, finalDamage };
  }

  triggerCounterSuccess() {
    // Efeito de parry bem sucedido
    this.state = FighterState.IDLE;
    this.counterWindowCounter = 0;
    AudioSynth.play('counter');
  }

  // Renderização de Silhueta Pixel Art sem anti-aliasing (Neo Geo Style)
  renderPixelArt(delta) {
    this.graphics.clear();

    if (this.hasSpriteSheet) {
      this.updateSpriteAnimation();
      if (this.superActiveFrames > 0) {
        this.graphics.lineStyle(2, 0xE8B33A, 0.8);
        this.graphics.strokeRect(-28, -96, 56, 96);
      }
      return;
    }

    const isP1 = this.playerIndex === 1;
    let bodyColor = this.mainColor;
    if (this.isMirrorMatch && !isP1) {
      bodyColor = this.mainColor === 0xC8102E ? 0x2A5A8B : 0xC8102E;
    }
    const accentColor = isP1 ? 0x4A90C2 : (this.isMirrorMatch ? 0xE8B33A : 0xC8102E);

    // Outline grosso 1px preto (#0D0D12)
    const outline = 0x0D0D12;

    const facing = this.facing;
    const isCrouching = this.state === FighterState.CROUCH;
    const isAttacking = this.state === FighterState.ATTACK;
    const isHit = this.state === FighterState.HIT_STUN;
    const isBlocking = this.state === FighterState.BLOCK || this.state === FighterState.BLOCK_STUN;
    const isKO = this.state === FighterState.KO;

    // Aura dourada se super estiver ativo
    if (this.superActiveFrames > 0) {
      this.graphics.lineStyle(2, 0xE8B33A, 0.7);
      this.graphics.strokeRect(-24, isCrouching ? -58 : -92, 48, isCrouching ? 58 : 92);
    }

    // Postura de Agachado vs Em Pé
    const torsoY = isCrouching ? -40 : -64;
    const headY = isCrouching ? -54 : -82;
    const legH = isCrouching ? 20 : 36;

    // Efeito de flash se atingido
    if (isHit) {
      this.graphics.fillStyle(0xFFFFFF, 1);
      this.graphics.fillRect(-18, torsoY - 20, 36, isCrouching ? 50 : 80);
      return;
    }

    // Se KO, desenha o lutador caído
    if (isKO) {
      this.graphics.lineStyle(1, outline, 1);
      this.graphics.fillStyle(bodyColor, 1);
      this.graphics.fillRect(-40, -18, 80, 18);
      this.graphics.strokeRect(-40, -18, 80, 18);
      this.graphics.fillStyle(this.skinColor, 1);
      this.graphics.fillRect(facing === 1 ? 30 : -42, -22, 14, 14);
      return;
    }

    // 1. Pernas (Pixel Blocks)
    this.graphics.lineStyle(1, outline, 1);
    this.graphics.fillStyle(0x1A1A24, 1);
    this.graphics.fillRect(-14, torsoY + 16, 12, legH);
    this.graphics.strokeRect(-14, torsoY + 16, 12, legH);
    this.graphics.fillRect(2, torsoY + 16, 12, legH);
    this.graphics.strokeRect(2, torsoY + 16, 12, legH);

    // 2. Tronco / Traje do Lutador
    this.graphics.fillStyle(bodyColor, 1);
    this.graphics.fillRect(-16, torsoY, 32, 28);
    this.graphics.strokeRect(-16, torsoY, 32, 28);

    // Faixa / Cinto na cintura
    this.graphics.fillStyle(accentColor, 1);
    this.graphics.fillRect(-16, torsoY + 24, 32, 5);
    this.graphics.strokeRect(-16, torsoY + 24, 32, 5);

    // 3. Cabeça (com traços de pele)
    this.graphics.fillStyle(this.skinColor, 1);
    this.graphics.fillRect(-10, headY, 20, 18);
    this.graphics.strokeRect(-10, headY, 20, 18);

    // Cabelo / Bandana cultural estilizada
    this.graphics.fillStyle(0x1A1A24, 1);
    this.graphics.fillRect(-11, headY - 2, 22, 7);

    // 4. Braços e Postura de Golpe
    if (isAttacking) {
      const atk = this.currentAttackData;
      const isKick = this.currentAttackId && this.currentAttackId.includes('kick');
      const isSpecial = this.currentAttackId && this.currentAttackId.includes('special');

      if (isKick) {
        // Perna estendida de chute
        this.graphics.fillStyle(accentColor, 1);
        const kickX = facing === 1 ? 8 : -38;
        this.graphics.fillRect(kickX, torsoY + 6, 30, 12);
        this.graphics.strokeRect(kickX, torsoY + 6, 30, 12);
      } else {
        // Braço estendido de soco
        this.graphics.fillStyle(this.skinColor, 1);
        const punchX = facing === 1 ? 10 : -36;
        this.graphics.fillRect(punchX, torsoY + 4, 28, 10);
        this.graphics.strokeRect(punchX, torsoY + 4, 28, 10);
      }

      // Efeito especial de projétil ou golpe elemental
      if (isSpecial) {
        this.graphics.fillStyle(this.goldColor, 1);
        const fxX = facing === 1 ? 36 : -48;
        this.graphics.fillRect(fxX, torsoY + 2, 14, 14);
      }
    } else if (isBlocking) {
      // Braços cruzados em defesa
      this.graphics.fillStyle(accentColor, 1);
      const shieldX = facing === 1 ? 6 : -18;
      this.graphics.fillRect(shieldX, torsoY + 2, 12, 22);
      this.graphics.strokeRect(shieldX, torsoY + 2, 12, 22);

      // Centelha de contra ativa se estiver na janela de 4 frames
      if (this.counterWindowCounter > 0) {
        this.graphics.lineStyle(2, 0xE8B33A, 1);
        this.graphics.strokeCircle(shieldX + 6, torsoY + 13, 14);
      }
    } else {
      // Braço em guarda padrão
      this.graphics.fillStyle(this.skinColor, 1);
      const armX = facing === 1 ? 4 : -16;
      this.graphics.fillRect(armX, torsoY + 6, 12, 14);
      this.graphics.strokeRect(armX, torsoY + 6, 12, 14);
    }
  }

  applyDefaultTint() {
    if (!this.sprite) return;
    if (this.isMirrorMatch && this.playerIndex === 2 && !this.scene.textures.exists(`${this.data.id}_p2_idle`)) {
      this.sprite.setTint(0x7ec8e3);
    } else {
      this.sprite.clearTint();
    }
  }

  playAnimation(animName, forceRestart = false) {
    if (!this.sprite) return;
    const animKey = `${this.data.id}_${this.palette}_${animName}`;
    if (this.scene.anims && this.scene.anims.exists(animKey)) {
      if (forceRestart || this.sprite.anims?.currentAnim?.key !== animKey || !this.sprite.anims.isPlaying) {
        this.sprite.play(animKey, true);
      }
    }
  }

  updateSpriteAnimation() {
    if (this.state === FighterState.KO) {
      this.playAnimation('defeat_ko');
    } else if (this.state === FighterState.HIT_STUN) {
      this.playAnimation('hit_stun');
      this.sprite.setTint(0xffffff);
      this.scene.time.delayedCall(70, () => {
        if (this.sprite) this.applyDefaultTint();
      });
    } else if (this.state === FighterState.BLOCK || this.state === FighterState.BLOCK_STUN) {
      this.playAnimation('block');
    } else if (this.state === FighterState.JUMP) {
      this.playAnimation('jump');
    } else if (this.state === FighterState.CROUCH) {
      this.playAnimation('crouch');
    } else if (this.state === FighterState.WALK) {
      const isWalkingForward = (this.facing === 1 && this.body.velocity.x > 0) || (this.facing === -1 && this.body.velocity.x < 0);
      this.playAnimation(isWalkingForward ? 'walk_forward' : 'walk_backward');
    } else if (this.state === FighterState.ATTACK) {
      if (this.currentAttackId === 'special_1') {
        this.playAnimation('special_1');
      } else if (this.currentAttackId === 'special_2') {
        this.playAnimation('special_2');
      } else if (this.currentAttackId === 'super') {
        this.playAnimation('super_attack');
      } else if (this.currentAttackId === 'heavy_punch') {
        this.playAnimation('heavy_punch');
      } else if (this.currentAttackId === 'light_kick') {
        this.playAnimation('light_kick');
      } else if (this.currentAttackId === 'heavy_kick') {
        this.playAnimation('heavy_kick');
      } else {
        this.playAnimation('light_punch');
      }
    } else {
      this.playAnimation('idle');
    }
  }
}
