// src/scenes/TitleScene.js
// Tela de Título do KUARAHY com estética Neo Geo e padrão decorativo

import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fundo base escuro com gradiente geométrico simulado em pixel
    this.bgGraphics = this.add.graphics();
    this.drawBackground(width, height);

    // Efeito de estrelas / partículas animadas em pixel no fundo
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
        size: Phaser.Math.Between(1, 3),
        speed: Phaser.Math.FloatBetween(0.4, 1.2),
        alpha: Phaser.Math.FloatBetween(0.3, 0.9),
      });
    }

    // Título Principal "KUARAHY" em estilo Neo Geo Arcade
    const titleShadow = this.add.text(width / 2 + 4, height / 2 - 80 + 4, 'KUARAHY', {
      fontFamily: 'monospace',
      fontSize: '76px',
      fontStyle: 'bold',
      color: '#C8102E',
      letterSpacing: '12px',
    }).setOrigin(0.5, 0.5);

    const titleMain = this.add.text(width / 2, height / 2 - 80, 'KUARAHY', {
      fontFamily: 'monospace',
      fontSize: '76px',
      fontStyle: 'bold',
      color: '#E8B33A',
      stroke: '#0D0D12',
      strokeThickness: 8,
      letterSpacing: '12px',
    }).setOrigin(0.5, 0.5);

    // Subtítulo temático
    this.add.text(width / 2, height / 2 - 10, 'ARCADE 2D FIGHTING SYSTEM', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#4A90C2',
      letterSpacing: '4px',
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, height / 2 + 15, 'ÑORAIRÕ — PARAGUAY 1998', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2E8B57',
      letterSpacing: '3px',
    }).setOrigin(0.5, 0.5);

    // Texto piscante "PRESS ENTER"
    this.pressEnterText = this.add.text(width / 2, height / 2 + 110, 'PRESS ENTER TO START', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      letterSpacing: '4px',
    }).setOrigin(0.5, 0.5);

    // Efeito de piscar clássico arcade (steps)
    this.tweens.add({
      targets: this.pressEnterText,
      alpha: 0,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Steps(1)',
    });

    // Rodapé de copyright fictício estilo SNK Neo Geo
    this.add.text(width / 2, height - 30, '© 2026 KUARAHY ENGINE • NEO GEO COMPLIANT SYSTEM', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#666677',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    // Captura de teclas para avançar
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // Também permitir clique/toque na tela
    this.input.on('pointerdown', () => this.startGame());
  }

  drawBackground(width, height) {
    this.bgGraphics.clear();

    // Faixas horizontais com tons da paleta
    this.bgGraphics.fillStyle(0x0D0D12, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    // Padrão geométrico estilo Ñandutí (linhas de tecelagem simétricas)
    this.bgGraphics.lineStyle(1, 0x1A1A24, 0.8);
    for (let x = 0; x < width; x += 32) {
      this.bgGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 32) {
      this.bgGraphics.lineBetween(0, y, width, y);
    }

    // Linhas diagonais simétricas cruzadas no centro
    this.bgGraphics.lineStyle(2, 0x1E6B3A, 0.35);
    this.bgGraphics.lineBetween(0, 0, width, height);
    this.bgGraphics.lineBetween(width, 0, 0, height);

    // Linha dourada decorativa central
    this.bgGraphics.lineStyle(2, 0xE8B33A, 0.4);
    this.bgGraphics.strokeCircle(width / 2, height / 2 - 80, 160);
    this.bgGraphics.strokeCircle(width / 2, height / 2 - 80, 200);
  }

  update() {
    // Animar as estrelas/partículas
    this.bgGraphics.clear();
    this.drawBackground(this.cameras.main.width, this.cameras.main.height);

    this.bgGraphics.fillStyle(0xE8B33A, 0.8);
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.cameras.main.height) {
        star.y = 0;
        star.x = Phaser.Math.Between(0, this.cameras.main.width);
      }
      this.bgGraphics.fillRect(star.x, star.y, star.size, star.size);
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
