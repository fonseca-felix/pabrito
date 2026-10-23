// src/scenes/TrainingScene.js
// Modo de Treinamento / Dojo do KUARAHY (Prática de Combos, Cancelamentos e Janela de Contra)

import Fighter from '../entities/Fighter.js';
import CombatSystem from '../systems/CombatSystem.js';
import { COMBAT } from '../systems/CombatConstants.js';
import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class TrainingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TrainingScene' });
  }

  init(data) {
    this.p1Data = data.p1;
    this.p2Data = data.p2;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    if (!this.p1Data || !this.p2Data) {
      const all = this.registry.get('fightersData') || [];
      this.p1Data = all.find(f => f.id === 'cabanas') || all[0];
      this.p2Data = all.find(f => f.id === 'itaipu_colossus') || all[1] || all[0];
    }

    // Cenário estilo Dojo de Treinamento em Pixel Art
    this.drawDojoBackground(width, height);

    this.groundY = 460;
    this.ground = this.add.rectangle(width / 2, this.groundY + 40, width + 200, 80, 0x1A1A24);
    this.physics.add.existing(this.ground, true);

    this.physics.world.setBounds(40, 0, width - 80, this.groundY);

    // Lutadores: P1 praticante, P2 boneco de treino (dummy)
    this.p1 = new Fighter(this, 300, this.groundY, this.p1Data, 1);
    this.p2 = new Fighter(this, width - 300, this.groundY, this.p2Data, 2);

    this.physics.add.collider(this.p1.container, this.ground);
    this.physics.add.collider(this.p2.container, this.ground);

    // Configuração de Inputs
    this.setupInputs();

    // HUD do Dojo
    this.hudGraphics = this.add.graphics().setDepth(15);
    this.createTrainingHud(width);

    // Informações de Input e Frame Data em tempo real
    this.inputDisplay = this.add.text(50, 130, 'ÚLTIMO GOLPE: NENHUM', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#E8B33A',
      backgroundColor: '#0D0D12',
      padding: { x: 6, y: 4 },
    }).setDepth(16);

    // Reset periódico de vida para prática contínua
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (this.p2.health < 50) this.p2.health = this.p2.maxHealth;
        this.p1.meter = this.p1.maxMeter; // No treino, P1 sempre tem meter disponível para testar super
      },
    });
  }

  drawDojoBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillStyle(0x121219, 1);
    bg.fillRect(0, 0, width, height);

    // Grade métrica para medição de alcance de golpes (Range)
    bg.lineStyle(1, 0x22222E, 0.7);
    for (let x = 0; x < width; x += 32) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 32) {
      bg.lineBetween(0, y, width, y);
    }

    // Marcações de chão estilo tatame / dojo
    bg.fillStyle(0x1E6B3A, 0.4);
    bg.fillRect(100, 440, width - 200, 20);

    bg.lineStyle(2, 0xE8B33A, 0.8);
    bg.strokeRect(100, 440, width - 200, 20);
  }

  setupInputs() {
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
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
  }

  createTrainingHud(width) {
    this.add.text(width / 2, 25, 'MODO DE TREINAMENTO (DOJO)', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#E8B33A',
      letterSpacing: '4px',
    }).setOrigin(0.5, 0.5).setDepth(16);

    this.add.text(width / 2, 48, 'ESC: VOLTAR AO MENU   |   P1 POSSUI ENERGIA INFINITA PARA TREINO', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#4A90C2',
      letterSpacing: '1px',
    }).setOrigin(0.5, 0.5).setDepth(16);
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.p1Keys.esc)) {
      AudioSynth.play('menu_select');
      this.scene.start('ModeSelectScene');
      return;
    }

    const punchJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.punch);
    const kickJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.kick);
    const specialJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.special);

    const downIsDown = this.p1Keys.down.isDown;
    const rightIsDown = this.p1Keys.right.isDown;

    const p1Input = {
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

    this.p1.update(delta, p1Input, this.p2);
    // Boneco dummy do treino fica em idle/guarda passiva
    this.p2.update(delta, { block: false }, this.p1);

    // Atualizar info de ataque executado
    if (this.p1.currentAttackId) {
      const atk = this.p1.currentAttackData;
      this.inputDisplay.setText(
        `GOLPE: ${this.p1.currentAttackId.toUpperCase()} | STARTUP: ${atk.startup}f | ACTIVE: ${atk.active}f | RECOVERY: ${atk.recovery}f | DANO: ${atk.damage}`
      );
    }

    // Colisão
    const p1Hitbox = this.p1.getActiveHitbox();
    if (p1Hitbox && !this.p1.hasHitThisAttack) {
      const p2Hurtbox = this.p2.getHurtbox();
      if (
        p1Hitbox.x < p2Hurtbox.x + p2Hurtbox.w &&
        p1Hitbox.x + p1Hitbox.w > p2Hurtbox.x &&
        p1Hitbox.y < p2Hurtbox.y + p2Hurtbox.h &&
        p1Hitbox.y + p1Hitbox.h > p2Hurtbox.y
      ) {
        this.p1.hasHitThisAttack = true;
        CombatSystem.resolve(this.p1, this.p2, p1Hitbox.data, this);
      }
    }

    // Desenhar barras de treino
    this.renderTrainingBars();
  }

  renderTrainingBars() {
    this.hudGraphics.clear();
    const width = this.cameras.main.width;

    // Barra de vida P1
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(50, 70, 320, 18);
    this.hudGraphics.fillStyle(0x2E8B57, 1);
    this.hudGraphics.fillRect(52, 72, (this.p1.health / this.p1.maxHealth) * 316, 14);

    // Barra de vida Dummy P2
    this.hudGraphics.fillStyle(0x0D0D12, 1);
    this.hudGraphics.fillRect(width - 370, 70, 320, 18);
    this.hudGraphics.fillStyle(0xC8102E, 1);
    this.hudGraphics.fillRect(width - 370 + 2, 72, (this.p2.health / this.p2.maxHealth) * 316, 14);

    // Barra de meter P1
    this.hudGraphics.fillStyle(0xE8B33A, 1);
    this.hudGraphics.fillRect(52, 94, (this.p1.meter / this.p1.maxMeter) * 220, 8);
  }
}
