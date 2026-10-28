// src/scenes/TitleScene.js
// Tela de Título do KUARAHY com estética Mortal Kombat e Capa Cinematográfica

import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Capa de Abertura Mortal Kombat / KUARAHY
    this.hasCover = this.textures.exists('cover_title');
    if (this.hasCover) {
      const cover = this.add.image(width / 2, height / 2, 'cover_title');
      cover.setDisplaySize(width, height).setDepth(0);

      // Vinheta de sombra cinematográfica superior e inferior
      const vignette = this.add.graphics().setDepth(1);
      vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.6, 0.6, 0, 0);
      vignette.fillRect(0, 0, width, 100);
      vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
      vignette.fillRect(0, height - 140, width, 140);
    } else {
      this.bgGraphics = this.add.graphics();
      this.drawBackground(width, height);
    }

    // Partículas de brasas em ascensão estilo MK
    this.embers = [];
    for (let i = 0; i < 45; i++) {
      this.embers.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
        size: Phaser.Math.Between(2, 4),
        speed: Phaser.Math.FloatBetween(0.8, 2.2),
        alpha: Phaser.Math.FloatBetween(0.4, 0.95),
        color: Phaser.Math.RND.pick([0xE8B33A, 0xC8102E, 0xF39C12, 0xFF4500]),
      });
    }
    this.emberGraphics = this.add.graphics().setDepth(2);

    // Texto de Início Arcade com brilho e borda
    this.pressEnterText = this.add.text(width / 2, height - 55, '► TOQUE NA TELA OU PRESSIONE [ENTER] PARA INICIAR ◄', {
      fontFamily: 'monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#E8B33A',
      stroke: '#0D0D12',
      strokeThickness: 5,
      letterSpacing: '3px',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Efeito de piscar estilo arcade
    this.tweens.add({
      targets: this.pressEnterText,
      alpha: 0.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Rodapé
    this.add.text(width / 2, height - 20, '© 2026 KUARAHY ENGINE • PARAGUAY ARCADE FIGHTING', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#888899',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Teclas para iniciar
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // Clique/toque direto
    this.input.on('pointerdown', () => this.startGame());
  }

  drawBackground(width, height) {
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x0D0D12, 1);
    this.bgGraphics.fillRect(0, 0, width, height);
  }

  update() {
    // Animação contínua das brasas de fogo
    this.emberGraphics.clear();
    const height = this.cameras.main.height;
    const width = this.cameras.main.width;

    for (const ember of this.embers) {
      ember.y -= ember.speed;
      ember.x += Math.sin(ember.y * 0.03) * 0.5;
      if (ember.y < -10) {
        ember.y = height + 10;
        ember.x = Phaser.Math.Between(0, width);
      }
      this.emberGraphics.fillStyle(ember.color, ember.alpha);
      this.emberGraphics.fillCircle(ember.x, ember.y, ember.size / 2);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.enterKey) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
      Phaser.Input.Keyboard.JustDown(this.jKey)
    ) {
      this.startGame();
    }
  }

  startGame() {
    AudioSynth.play('menu_select');
    this.cameras.main.fade(250, 13, 13, 18);
    this.time.delayedCall(250, () => {
      this.scene.start('ModeSelectScene');
    });
  }
}
