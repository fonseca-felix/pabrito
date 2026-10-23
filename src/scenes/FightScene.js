// src/scenes/FightScene.js
// O Coração do KUARAHY: Loop de Combate 2D, RoundSystem MD3, HUD Canvas e Câmera

import Fighter from '../entities/Fighter.js';
import CombatSystem from '../systems/CombatSystem.js';
import { COMBAT } from '../systems/CombatConstants.js';
import { BotBrain } from '../systems/BotBrain.js';
import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class FightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FightScene' });
  }

  init(data) {
    this.p1Data = data.p1;
    this.p2Data = data.p2;
    this.gameMode = data.mode || 'arcade';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Se os dados não vierem carregados por algum motivo, carrega padrão do registry
    if (!this.p1Data || !this.p2Data) {
      const all = this.registry.get('fightersData') || [];
      this.p1Data = all[0] || { id: 'terere', name: 'Tereré', color: '#2E8B57', stats: { damage: 3, speed: 3, defense: 3, range: 3 } };
      this.p2Data = all[5] || { id: 'guarani', name: 'Guarani', color: '#1E6B3A', stats: { damage: 4, speed: 3, defense: 4, range: 3 } };
    }

    // 1. Cenário da Arena (Pixel Art Temático Paraguaio)
    this.drawStageBackground(width, height);

    // Chão físico da arena
    this.groundY = 460;
    this.ground = this.add.rectangle(width / 2, this.groundY + 40, width + 200, 80, 0x1A1A24);
    this.physics.add.existing(this.ground, true);

    // Limites de colisão com o mundo
    this.physics.world.setBounds(40, 0, width - 80, this.groundY);

    // 2. Instâncias dos Lutadores
    this.p1 = new Fighter(this, 280, this.groundY, this.p1Data, 1);
    this.p2 = new Fighter(this, width - 280, this.groundY, this.p2Data, 2);

    this.physics.add.collider(this.p1.container, this.ground);
    this.physics.add.collider(this.p2.container, this.ground);

    // 3. IA BotBrain se for modo Arcade
    if (this.gameMode === 'arcade') {
      this.botBrain = new BotBrain('normal');
    } else {
      this.botBrain = null;
    }

    // 4. Mapeamento de Controles (Seção 9)
    this.setupInputs();

    // 5. Sistema de Rounds (MD3 a 60s)
    this.p1RoundsWon = 0;
    this.p2RoundsWon = 0;
    this.roundNumber = 1;
    this.roundTimeRemaining = COMBAT.ROUND_TIME;
    this.isRoundActive = false;
    this.isMatchOver = false;

    // 6. HUD Desenhado via Canvas
    this.createHudCanvas(width, height);

    // 7. Textos Centrais de Transição (ROUND 1, FIGHT, K.O., VICTORY)
    this.bannerText = this.add.text(width / 2, height / 2 - 50, '', {
      fontFamily: 'monospace',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#E8B33A',
      stroke: '#0D0D12',
      strokeThickness: 8,
      letterSpacing: '8px',
    }).setOrigin(0.5, 0.5).setDepth(20).setVisible(false);

    this.subBannerText = this.add.text(width / 2, height / 2 + 15, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#FFFFFF',
      letterSpacing: '4px',
    }).setOrigin(0.5, 0.5).setDepth(20).setVisible(false);

    // Iniciar Round 1
    this.startRound();

    // Timer decrescente de combate
    this.roundTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickSecond,
      callbackScope: this,
      loop: true,
    });
  }

  drawStageBackground(width, height) {
    const stage = this.add.graphics();

    // Céu de pôr do sol sobre o Rio Paraguai / Assunção
    stage.fillStyle(0x0D0D12, 1);
    stage.fillRect(0, 0, width, height);

    // Faixas de pôr do sol degradê em pixel art (Neo Geo)
    const skyTones = [0x2A5A8B, 0x4A90C2, 0xE8B33A, 0xC8102E, 0x8B0A1F];
    const skySlice = 45;
    skyTones.forEach((color, i) => {
      stage.fillStyle(color, 0.6);
      stage.fillRect(0, i * skySlice, width, skySlice);
    });

    // Sol dourado no horizonte (Kuarahy em Guarani significa Sol)
    stage.fillStyle(0xE8B33A, 0.85);
    stage.fillRect(width / 2 - 60, 90, 120, 120);
    stage.fillStyle(0xFFF2A3, 1);
    stage.fillRect(width / 2 - 40, 110, 80, 80);

    // Silhueta distante de palmeiras de Karanda'y e arquitetura colonial
    stage.fillStyle(0x1A1A24, 1);
    for (let x = 60; x < width; x += 110) {
      // Copa estilisada
      stage.fillRect(x - 24, 210, 48, 16);
      stage.fillRect(x - 16, 198, 32, 12);
      // Tronco
      stage.fillRect(x - 4, 226, 8, 110);
    }

    // Pavimento da Arena (pedras de paralelepípedo colonial)
    stage.fillStyle(0x22222E, 1);
    stage.fillRect(0, 336, width, height - 336);

    stage.lineStyle(1, 0x38384D, 0.6);
    for (let y = 336; y < height; y += 14) {
      stage.lineBetween(0, y, width, y);
    }
  }

  setupInputs() {
    // P1 (Teclado Esquerdo)
    this.p1Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      punch: Phaser.Input.Keyboard.KeyCodes.J,
      kick: Phaser.Input.Keyboard.KeyCodes.K,
      special: Phaser.Input.Keyboard.KeyCodes.L,
      throwKey: Phaser.Input.Keyboard.KeyCodes.U,
      blockKey: Phaser.Input.Keyboard.KeyCodes.I,
    });

    // P2 (Teclado Direito - Setas + Numpad e atalhos alternativos para teclados compactos)
    this.p2Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      punch: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      kick: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      special: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
      throwKey: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      blockKey: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE,
      // Teclas alternativas P2 para laptops sem numpad
      altPunch: Phaser.Input.Keyboard.KeyCodes.COMMA,
      altKick: Phaser.Input.Keyboard.KeyCodes.PERIOD,
      altSpecial: Phaser.Input.Keyboard.KeyCodes.SEMICOLON,
      altThrow: Phaser.Input.Keyboard.KeyCodes.P,
      altBlock: Phaser.Input.Keyboard.KeyCodes.O,
    });
  }

  createHudCanvas(width, height) {
    this.hudGraphics = this.add.graphics().setDepth(15);

    // Textos de Nomes dos Lutadores
    this.p1NameText = this.add.text(50, 24, this.p1Data.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setDepth(16);

    this.p2NameText = this.add.text(width - 50, 24, this.p2Data.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(1, 0).setDepth(16);

    // Timer Central
    this.timerText = this.add.text(width / 2, 40, '60', {
      fontFamily: 'monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#E8B33A',
      stroke: '#0D0D12',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(16);

    // Combo Counter
    this.comboText = this.add.text(width / 2, 120, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#C8102E',
      stroke: '#0D0D12',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setDepth(16);
  }

  startRound() {
    this.isRoundActive = false;
    this.roundTimeRemaining = COMBAT.ROUND_TIME;

    // Reset de posições
    const width = this.cameras.main.width;
    this.p1.reset(280, 1);
    this.p2.reset(width - 280, -1);

    // Anúncio "ROUND N"
    this.bannerText.setText(`ROUND ${this.roundNumber}`).setVisible(true);
    this.subBannerText.setText('ÑORAIRÕ!').setVisible(true);
    AudioSynth.play('round_bell');

    this.time.delayedCall(1200, () => {
      this.bannerText.setText('FIGHT!').setColor('#C8102E');
      this.subBannerText.setVisible(false);
      AudioSynth.play('punch_heavy');

      this.time.delayedCall(700, () => {
        this.bannerText.setVisible(false);
        this.isRoundActive = true;
      });
    });
  }

  tickSecond() {
    if (!this.isRoundActive || this.isMatchOver) return;

    this.roundTimeRemaining--;
    if (this.roundTimeRemaining <= 0) {
      this.roundTimeRemaining = 0;
      this.handleTimeOver();
    }
  }

  handleTimeOver() {
    this.isRoundActive = false;
    AudioSynth.play('round_bell');

    if (this.p1.health > this.p2.health) {
      this.endRound(1, 'TIME OVER — P1 VENCE!');
    } else if (this.p2.health > this.p1.health) {
      this.endRound(2, 'TIME OVER — P2 VENCE!');
    } else {
      this.endRound(0, 'TIME OVER — EMPATE!');
    }
  }

  endRound(winnerIndex, customMessage = null) {
    if (this.isMatchOver) return;
    this.isRoundActive = false;

    if (winnerIndex === 1) {
      this.p1RoundsWon++;
    } else if (winnerIndex === 2) {
      this.p2RoundsWon++;
    }

    const msg = customMessage || (winnerIndex === 1 ? 'K.O. — P1 VENCE O ROUND!' : 'K.O. — P2 VENCE O ROUND!');
    this.bannerText.setText('K.O.').setColor('#C8102E').setVisible(true);
    this.subBannerText.setText(msg).setVisible(true);

    // Checar condição de Vitória da Melhor de 3 (MD3)
    const needed = COMBAT.ROUNDS_TO_WIN;
    if (this.p1RoundsWon >= needed || this.p2RoundsWon >= needed) {
      this.isMatchOver = true;
      const finalChamp = this.p1RoundsWon >= needed ? this.p1Data.name : this.p2Data.name;

      this.time.delayedCall(1800, () => {
        this.bannerText.setText('VICTORY!').setColor('#E8B33A');
        this.subBannerText.setText(`${finalChamp.toUpperCase()} É O CAMPEÃO!`);
        AudioSynth.play('super_activate');

        // Retornar à tela de seleção após 4 segundos
        this.time.delayedCall(3800, () => {
          this.scene.start('CharSelectScene', { mode: this.gameMode });
        });
      });
    } else {
      // Próximo round
      this.roundNumber++;
      this.time.delayedCall(2200, () => {
        this.startRound();
      });
    }
  }

  update(time, delta) {
    // 1. Processar Inputs do P1
    const p1Input = this.readP1Input();

    // 2. Processar Inputs do P2 (Jogador 2 ou BotBrain)
    const p2Input = this.readP2Input();

    // 3. Atualizar FSM dos lutadores
    if (this.isRoundActive) {
      this.p1.update(delta, p1Input, this.p2);
      this.p2.update(delta, p2Input, this.p1);

      // 4. Testar Colisão de Ataques via CombatSystem
      this.checkCombatHits();

      // 5. Verificar KO imediato
      if (this.p1.health <= 0 && this.p2.health <= 0) {
        this.endRound(0, 'DOUBLE K.O.!');
      } else if (this.p1.health <= 0) {
        this.endRound(2);
      } else if (this.p2.health <= 0) {
        this.endRound(1);
      }
    } else {
      // Se round parado, apenas física básica e animação passiva
      this.p1.update(delta, { block: false }, this.p2);
      this.p2.update(delta, { block: false }, this.p1);
    }

    // 6. Atualizar HUD Canvas
    this.renderHudCanvas();
  }

  readP1Input() {
    if (!this.isRoundActive) return { block: false };

    const punchJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.punch);
    const kickJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.kick);
    const specialJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.special);

    const downIsDown = this.p1Keys.down.isDown;
    const rightIsDown = this.p1Keys.right.isDown;

    return {
      up: this.p1Keys.up.isDown,
      down: downIsDown,
      left: this.p1Keys.left.isDown,
      right: rightIsDown,
      punch: punchJustDown,
      punchHeavy: punchJustDown && rightIsDown,
      kick: kickJustDown,
      kickHeavy: kickJustDown && rightIsDown,
      special1: specialJustDown && downIsDown,
      special2: specialJustDown && !downIsDown,
      superMove: specialJustDown && this.p1.meter >= 100,
      throw: Phaser.Input.Keyboard.JustDown(this.p1Keys.throwKey),
      block: this.p1Keys.blockKey.isDown,
    };
  }

  readP2Input() {
    if (!this.isRoundActive) return { block: false };

    // Se for modo Arcade, usa o cérebro da IA
    if (this.botBrain) {
      return this.botBrain.update(this.p2, this.p1, this.roundTimeRemaining);
    }

    // Se for Versus 2P local
    const p2Punch = Phaser.Input.Keyboard.JustDown(this.p2Keys.punch) || Phaser.Input.Keyboard.JustDown(this.p2Keys.altPunch);
    const p2Kick = Phaser.Input.Keyboard.JustDown(this.p2Keys.kick) || Phaser.Input.Keyboard.JustDown(this.p2Keys.altKick);
    const p2Special = Phaser.Input.Keyboard.JustDown(this.p2Keys.special) || Phaser.Input.Keyboard.JustDown(this.p2Keys.altSpecial);

    const p2Down = this.p2Keys.down.isDown;
    const p2Left = this.p2Keys.left.isDown;

    return {
      up: this.p2Keys.up.isDown,
      down: p2Down,
      left: p2Left,
      right: this.p2Keys.right.isDown,
      punch: p2Punch,
      punchHeavy: p2Punch && p2Left,
      kick: p2Kick,
      kickHeavy: p2Kick && p2Left,
      special1: p2Special && p2Down,
      special2: p2Special && !p2Down,
      superMove: p2Special && this.p2.meter >= 100,
      throw: Phaser.Input.Keyboard.JustDown(this.p2Keys.throwKey) || Phaser.Input.Keyboard.JustDown(this.p2Keys.altThrow),
      block: this.p2Keys.blockKey.isDown || this.p2Keys.altBlock.isDown,
    };
  }

  checkCombatHits() {
    // 1. Checar se P1 acerta P2
    const p1Hitbox = this.p1.getActiveHitbox();
    if (p1Hitbox && !this.p1.hasHitThisAttack) {
      const p2Hurtbox = this.p2.getHurtbox();
      if (this.checkAABB(p1Hitbox, p2Hurtbox)) {
        this.p1.hasHitThisAttack = true;
        const res = CombatSystem.resolve(this.p1, this.p2, p1Hitbox.data, this);
        if (res.hit) {
          this.showComboDisplay(1, this.p1.comboCount);
        }
      }
    }

    // 2. Checar se P2 acerta P1
    const p2Hitbox = this.p2.getActiveHitbox();
    if (p2Hitbox && !this.p2.hasHitThisAttack) {
      const p1Hurtbox = this.p1.getHurtbox();
      if (this.checkAABB(p2Hitbox, p1Hurtbox)) {
        this.p2.hasHitThisAttack = true;
        const res = CombatSystem.resolve(this.p2, this.p1, p2Hitbox.data, this);
        if (res.hit) {
          this.showComboDisplay(2, this.p2.comboCount);
        }
      }
    }
  }

  checkAABB(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.w &&
      rectA.x + rectA.w > rectB.x &&
      rectA.y < rectB.y + rectB.h &&
      rectA.y + rectA.h > rectB.y
    );
  }

  showComboDisplay(playerNum, count) {
    if (count > 1) {
      this.comboText.setText(`COMBO x ${count}!`).setVisible(true);
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.3,
        scaleY: 1.3,
        yoyo: true,
        duration: 100,
        onComplete: () => {
          this.time.delayedCall(600, () => {
            if (this.p1.comboCount <= 1 && this.p2.comboCount <= 1) {
              this.comboText.setVisible(false);
            }
          });
        },
      });
    }
  }

  renderHudCanvas() {
    this.hudGraphics.clear();
    const width = this.cameras.main.width;

    // Atualizar Timer
    this.timerText.setText(Math.ceil(this.roundTimeRemaining).toString());

    // 1. Barras de Vida (Verde -> Amarelo -> Vermelho)
    const barW = 340;
    const barH = 22;

    // Fundo da Barra P1 (Esquerda)
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(50, 48, barW, barH);
    this.hudGraphics.lineStyle(2, 0x555566, 1);
    this.hudGraphics.strokeRect(50, 48, barW, barH);

    // Vida Atual P1
    const p1HpW = Math.max(0, (this.p1.health / this.p1.maxHealth) * (barW - 4));
    let p1Color = 0x2E8B57; // Verde
    if (this.p1.health < 30) p1Color = 0xC8102E; // Vermelho
    else if (this.p1.health < 60) p1Color = 0xD4A017; // Amarelo
    this.hudGraphics.fillStyle(p1Color, 1);
    this.hudGraphics.fillRect(52, 50, p1HpW, barH - 4);

    // Fundo da Barra P2 (Direita)
    const p2BarX = width - 50 - barW;
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(p2BarX, 48, barW, barH);
    this.hudGraphics.lineStyle(2, 0x555566, 1);
    this.hudGraphics.strokeRect(p2BarX, 48, barW, barH);

    // Vida Atual P2 (Preenche da direita para a esquerda)
    const p2HpW = Math.max(0, (this.p2.health / this.p2.maxHealth) * (barW - 4));
    let p2Color = 0x2E8B57;
    if (this.p2.health < 30) p2Color = 0xC8102E;
    else if (this.p2.health < 60) p2Color = 0xD4A017;
    this.hudGraphics.fillStyle(p2Color, 1);
    this.hudGraphics.fillRect(p2BarX + (barW - 4 - p2HpW), 50, p2HpW, barH - 4);

    // 2. Indicadores de Rounds Ganhos (● / ○)
    for (let r = 0; r < COMBAT.ROUNDS_TO_WIN; r++) {
      // P1 Round Dots
      const p1DotWon = r < this.p1RoundsWon;
      this.hudGraphics.fillStyle(p1DotWon ? 0xC8102E : 0x1A1A24, 1);
      this.hudGraphics.fillCircle(50 + r * 18 + 8, 80, 6);
      this.hudGraphics.lineStyle(2, 0xE8B33A, 1);
      this.hudGraphics.strokeCircle(50 + r * 18 + 8, 80, 6);

      // P2 Round Dots
      const p2DotWon = r < this.p2RoundsWon;
      this.hudGraphics.fillStyle(p2DotWon ? 0xC8102E : 0x1A1A24, 1);
      this.hudGraphics.fillCircle(width - 50 - r * 18 - 8, 80, 6);
      this.hudGraphics.lineStyle(2, 0xE8B33A, 1);
      this.hudGraphics.strokeCircle(width - 50 - r * 18 - 8, 80, 6);
    }

    // 3. Barra de Super Meter (Dourada)
    const meterW = 240;
    const meterH = 12;

    // P1 Meter
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(50, 96, meterW, meterH);
    this.hudGraphics.lineStyle(2, 0x333344, 1);
    this.hudGraphics.strokeRect(50, 96, meterW, meterH);

    const p1MeterFill = (this.p1.meter / this.p1.maxMeter) * (meterW - 4);
    this.hudGraphics.fillStyle(this.p1.meter >= 100 ? 0xFFF2A3 : 0xE8B33A, 1);
    this.hudGraphics.fillRect(52, 98, p1MeterFill, meterH - 4);

    // P2 Meter
    const p2MeterX = width - 50 - meterW;
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(p2MeterX, 96, meterW, meterH);
    this.hudGraphics.lineStyle(2, 0x333344, 1);
    this.hudGraphics.strokeRect(p2MeterX, 96, meterW, meterH);

    const p2MeterFill = (this.p2.meter / this.p2.maxMeter) * (meterW - 4);
    this.hudGraphics.fillStyle(this.p2.meter >= 100 ? 0xFFF2A3 : 0xE8B33A, 1);
    this.hudGraphics.fillRect(p2MeterX + (meterW - 4 - p2MeterFill), 98, p2MeterFill, meterH - 4);
  }
}
