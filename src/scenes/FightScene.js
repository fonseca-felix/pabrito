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
      this.p1Data = all.find(f => f.id === 'cabanas') || all[0];
      this.p2Data = all.find(f => f.id === 'itaipu_colossus') || all[1] || all[0];
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

    // 6.5. Painel Modal de Lista de Golpes (Movelist)
    this.createMovelistModal(width, height);

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
    const stages = [
      { key: 'stage_ruinas', name: 'RUÍNAS JESUÍTICAS DE TAVARANGUE' },
      { key: 'stage_itaipu', name: 'VERTEDOURO DE ITAIPU' },
      { key: 'stage_panteon', name: 'PANTEÓN NACIONAL DE LOS HÉROES' },
      { key: 'stage_chaco', name: 'PÂNTANO DO CHACO BOREAL' },
      { key: 'stage_defensores', name: 'ESTÁDIO DEFENSORES DEL CHACO' },
    ];

    // Escolhe aleatoriamente ou pelo lutador P1
    const chosen = Phaser.Utils.Array.GetRandom(stages);
    this.currentStageName = chosen.name;

    if (this.textures.exists(chosen.key)) {
      const bg = this.add.image(width / 2, height / 2, chosen.key);
      bg.setDisplaySize(width, height).setDepth(0);

      // Efeito de vinheta de combate e sombra do piso
      const shade = this.add.graphics().setDepth(1);
      shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0.65, 0, 0);
      shade.fillRect(0, 0, width, 90);
      shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6);
      shade.fillRect(0, height - 110, width, 110);
    } else {
      const stage = this.add.graphics();
      stage.fillStyle(0x0D0D12, 1);
      stage.fillRect(0, 0, width, height);
    }

    // Banner com o nome da arena no canto inferior
    this.stageNameText = this.add.text(width / 2, height - 25, 'ARENA: ' + this.currentStageName, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#E8B33A',
      letterSpacing: '3px',
      stroke: '#0D0D12',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(16);

    this.time.delayedCall(4000, () => {
      if (this.stageNameText) {
        this.tweens.add({
          targets: this.stageNameText,
          alpha: 0,
          duration: 1000,
        });
      }
    });
  }

  setupInputs() {
    // P1 aceita TANTO WASD quanto Setas do teclado
    this.p1Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      punch: Phaser.Input.Keyboard.KeyCodes.J,
      punchAlt: Phaser.Input.Keyboard.KeyCodes.Z,
      kick: Phaser.Input.Keyboard.KeyCodes.K,
      kickAlt: Phaser.Input.Keyboard.KeyCodes.X,
      special: Phaser.Input.Keyboard.KeyCodes.L,
      specialAlt: Phaser.Input.Keyboard.KeyCodes.C,
      throwKey: Phaser.Input.Keyboard.KeyCodes.U,
      blockKey: Phaser.Input.Keyboard.KeyCodes.I,
    });

    // Tecla Movelist (TAB ou M ou ESC)
    this.movelistKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.movelistKeyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Conectar botão HTML externo se existir
    window.toggleMovelistInGame = () => this.toggleMovelist();

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
    const isMirror = this.p1Data.id === this.p2Data.id;
    this.p1NameText = this.add.text(50, 24, `${this.p1Data.name.toUpperCase()} [P1]`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setDepth(16);

    this.p2NameText = this.add.text(width - 50, 24, isMirror ? `${this.p2Data.name.toUpperCase()} [P2 ALT]` : `${this.p2Data.name.toUpperCase()} [P2]`, {
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

    // Mini Portraits ao lado das barras de vida
    const p1PortraitKey = `portrait_${this.p1Data.id}_p1`;
    if (this.textures.exists(p1PortraitKey)) {
      this.add.image(28, 59, p1PortraitKey).setDisplaySize(36, 36).setDepth(16);
      this.add.rectangle(28, 59, 38, 38).setStrokeStyle(2, 0x4A90C2).setDepth(17);
    }

    const p2PortraitKey = `portrait_${this.p2Data.id}_${isMirror ? 'p2' : 'p1'}`;
    if (this.textures.exists(p2PortraitKey)) {
      const p2Img = this.add.image(width - 28, 59, p2PortraitKey).setDisplaySize(36, 36).setDepth(16);
      p2Img.setFlipX(true);
      this.add.rectangle(width - 28, 59, 38, 38).setStrokeStyle(2, 0xC8102E).setDepth(17);
    }
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
    const isMirrorMatch = this.p1Data.id === this.p2Data.id;
    this.subBannerText.setText(isMirrorMatch ? 'CONFRONTO ESPELHO: ÑORAIRÕ!' : 'ÑORAIRÕ!').setColor(isMirrorMatch ? '#E8B33A' : '#FFFFFF').setVisible(true);
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
    const width = this.cameras.main.width;
    // Abrir/Fechar Lista de Golpes com TAB, M ou ESC
    if (Phaser.Input.Keyboard.JustDown(this.movelistKey) ||
        Phaser.Input.Keyboard.JustDown(this.movelistKeyM) ||
        Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.toggleMovelist();
    }

    if (this.isMovelistOpen) return;
    // 1. Processar Inputs do P1
    const p1Input = this.readP1Input();

    // 2. Processar Inputs do P2 (Jogador 2 ou BotBrain)
    const p2Input = this.readP2Input();

    // 3. Atualizar FSM dos lutadores
    if (this.isRoundActive) {
      this.p1.update(delta, p1Input, this.p2);
      this.p2.update(delta, p2Input, this.p1);

      // Trava de câmera arcade: impede que lutadores ultrapassem os limites da tela
      const minX = 70;
      const maxX = width - 70;
      this.p1.container.x = Phaser.Math.Clamp(this.p1.container.x, minX, maxX);
      this.p2.container.x = Phaser.Math.Clamp(this.p2.container.x, minX, maxX);

      // Limitar distância máxima para os dois lutadores permanecerem enquadrados
      const maxDistance = width - 160;
      const currentDist = Math.abs(this.p1.container.x - this.p2.container.x);
      if (currentDist > maxDistance) {
        const mid = (this.p1.container.x + this.p2.container.x) / 2;
        if (this.p1.container.x < this.p2.container.x) {
          this.p1.container.x = mid - maxDistance / 2;
          this.p2.container.x = mid + maxDistance / 2;
        } else {
          this.p1.container.x = mid + maxDistance / 2;
          this.p2.container.x = mid - maxDistance / 2;
        }
      }

      // Impede pulo acima do topo da tela
      this.p1.container.y = Math.max(120, this.p1.container.y);
      this.p2.container.y = Math.max(120, this.p2.container.y);

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
    if (!this.isRoundActive || this.isMovelistOpen) return { block: false };

    const v = window.__virtualInputs || {};

    const punchJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.punch) ||
                          Phaser.Input.Keyboard.JustDown(this.p1Keys.punchAlt) ||
                          Boolean(v.punchJustDown);

    const kickJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.kick) ||
                         Phaser.Input.Keyboard.JustDown(this.p1Keys.kickAlt) ||
                         Boolean(v.kickJustDown);

    const specialJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.special) ||
                            Phaser.Input.Keyboard.JustDown(this.p1Keys.specialAlt) ||
                            Boolean(v.specialJustDown);

    const throwJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.throwKey) ||
                          Boolean(v.throwJustDown);

    // Consumir triggers instantâneos
    if (v.punchJustDown) v.punchJustDown = false;
    if (v.kickJustDown) v.kickJustDown = false;
    if (v.specialJustDown) v.specialJustDown = false;
    if (v.throwJustDown) v.throwJustDown = false;

    // Movimentação aceita WASD, Setas e botões da tela
    const isUp = this.p1Keys.up.isDown || this.p1Keys.upArrow.isDown || Boolean(v.up);
    const isDown = this.p1Keys.down.isDown || this.p1Keys.downArrow.isDown || Boolean(v.down);
    const isLeft = this.p1Keys.left.isDown || this.p1Keys.leftArrow.isDown || Boolean(v.left);
    const isRight = this.p1Keys.right.isDown || this.p1Keys.rightArrow.isDown || Boolean(v.right);
    const isBlock = this.p1Keys.blockKey.isDown || Boolean(v.block);

    return {
      up: isUp,
      down: isDown,
      left: isLeft,
      right: isRight,
      punch: punchJustDown,
      punchHeavy: punchJustDown && isRight,
      kick: kickJustDown,
      kickHeavy: kickJustDown && isRight,
      special1: specialJustDown && isDown,
      special2: specialJustDown && !isDown,
      superMove: specialJustDown && this.p1.meter >= 100,
      throw: throwJustDown,
      block: isBlock,
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

  createMovelistModal(width, height) {
    this.isMovelistOpen = false;

    this.movelistContainer = this.add.container(width / 2, height / 2).setDepth(100).setVisible(false);

    // Fundo escuro com blur simulado
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    backdrop.setInteractive();

    // Caixa do menu
    const modalW = 680;
    const modalH = 440;
    const box = this.add.rectangle(0, 0, modalW, modalH, 0x121219);
    box.setStrokeStyle(3, 0xE8B33A);

    // Título Superior
    const titleText = this.add.text(0, -modalH / 2 + 30, 'LISTA DE GOLPES & COMANDOS', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#E8B33A', letterSpacing: '4px',
    }).setOrigin(0.5, 0.5);

    // Dados de Golpes do P1
    const p1 = this.p1Data;
    const sp1 = p1.specials?.special_1 || { name: 'Especial 1', input: '↓→+Soco' };
    const sp2 = p1.specials?.special_2 || { name: 'Especial 2', input: '→↓+Chute' };
    const sup = p1.super || { name: 'Super Golpe', input: '↓→↓→+Especial' };

    const contentText = this.add.text(-modalW / 2 + 40, -modalH / 2 + 65, 
      `LUTADOR ATUAL: ${p1.name.toUpperCase()} (${p1.title || p1.archetype.toUpperCase()})\n\n` +
      `⚡ GOLPES ESPECIAIS (P1):\n` +
      `  ► ${sp1.name.padEnd(28)} ${sp1.input || '↓→ + Soco [J]'} (Dano: ${sp1.damage || 14})\n` +
      `  ► ${sp2.name.padEnd(28)} ${sp2.input || '→↓ + Chute [K]'} (Dano: ${sp2.damage || 14})\n` +
      `  ★ SUPER: ${sup.name.padEnd(24)} Especial [L] com 100% de Energia!\n\n` +
      `🥊 GOLPES BÁSICOS & MOVIMENTO:\n` +
      `  • Soco Fraco: [J] ou [Z]           • Soco Forte:  [D + J] ou [→ + J]\n` +
      `  • Chute Fraco: [K] ou [X]          • Chute Forte: [D + K] ou [→ + K]\n` +
      `  • Mover: [A / D] ou [◀ / ▶]       • Pular: [W] ou [▲] | Agachar: [S] ou [▼]\n` +
      `  • Defesa: Segurar [I]             • Contra/Parry: Toque em [I] no frame exato\n` +
      `  • Agarrão: [U]\n\n` +
      `💡 DICA DE ARCADE: Golpes normais cancelam em golpes especiais (Combos fluidos!)`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#FFFFFF', lineHeight: 18,
    });

    // Botão de Fechar
    const closeBtnBg = this.add.rectangle(0, modalH / 2 - 35, 260, 36, 0xC8102E);
    closeBtnBg.setStrokeStyle(2, 0xFFFFFF);
    closeBtnBg.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(0, modalH / 2 - 35, 'VOLTAR AO COMBATE [ESC/TAB]', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    closeBtnBg.on('pointerdown', () => this.toggleMovelist());

    this.movelistContainer.add([backdrop, box, titleText, contentText, closeBtnBg, closeBtnText]);
  }

  toggleMovelist() {
    this.isMovelistOpen = !this.isMovelistOpen;
    this.movelistContainer.setVisible(this.isMovelistOpen);
    AudioSynth.play(this.isMovelistOpen ? 'menu_select' : 'menu_move');
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
