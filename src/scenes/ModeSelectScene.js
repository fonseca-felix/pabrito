// src/scenes/ModeSelectScene.js
// Seleção de Modos de Jogo do KUARAHY

import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fundo escuro
    this.add.rectangle(width / 2, height / 2, width, height, 0x0D0D12);

    // Borda decorativa estilo Neo Geo
    const border = this.add.graphics();
    border.lineStyle(4, 0x2A5A8B, 1);
    border.strokeRect(30, 30, width - 60, height - 60);
    border.lineStyle(2, 0xE8B33A, 0.8);
    border.strokeRect(36, 36, width - 72, height - 72);

    // Título do Menu
    this.add.text(width / 2, 80, 'MODO DE JOGO', {
      fontFamily: 'monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#E8B33A',
      letterSpacing: '6px',
    }).setOrigin(0.5, 0.5);

    this.modes = [
      { id: 'arcade', label: '1. ARCADE (VS CPU)', desc: 'Desafie os lutadores paraguaios controlados por IA', active: true },
      { id: 'versus', label: '2. VERSUS 2P (LOCAL)', desc: 'Duelo mano a mano no mesmo teclado (P1 vs P2)', active: true },
      { id: 'lan', label: '3. VERSUS LAN [FASE 3 - EM BREVE]', desc: 'Combate em rede local via WebSocket de baixa latência', active: false },
      { id: 'training', label: '4. TREINAMENTO (DOJO)', desc: 'Pratique normais, especiais, cancelamentos e o timing do Contra', active: true },
    ];

    this.selectedIndex = 0;
    this.menuItems = [];

    const startY = 170;
    const spacing = 65;

    this.modes.forEach((mode, index) => {
      const container = this.add.container(width / 2, startY + index * spacing);

      const bgBox = this.add.rectangle(0, 0, 680, 50, 0x1A1A24, 0.9);
      bgBox.setStrokeStyle(2, 0x38384D);
      bgBox.setInteractive({ useHandCursor: true });
      bgBox.on('pointerdown', () => {
        this.selectedIndex = index;
        this.updateSelectionVisuals();
        this.confirmSelection();
      });

      const titleText = this.add.text(-320, -12, mode.label, {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: mode.active ? '#FFFFFF' : '#666677',
      });

      const descText = this.add.text(-320, 10, mode.desc, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: mode.active ? '#A0A0B2' : '#555566',
      });

      const cursorIndicator = this.add.text(-345, -12, '▶', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#E8B33A',
      });
      cursorIndicator.setVisible(index === this.selectedIndex);

      container.add([bgBox, titleText, descText, cursorIndicator]);
      this.menuItems.push({ container, bgBox, titleText, descText, cursorIndicator, mode });
    });

    // Instruções de controle no rodapé
    this.add.text(width / 2, height - 60, '↑/↓ ou W/S: NAVEGAR   |   ENTER / J / BARRA: CONFIRMAR', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#4A90C2',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    // Controles de teclado
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    this.updateSelectionVisuals();
  }

  updateSelectionVisuals() {
    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      item.cursorIndicator.setVisible(isSelected);

      if (isSelected) {
        item.bgBox.setFillStyle(0x2E8B57, 0.9);
        item.bgBox.setStrokeStyle(2, 0xE8B33A);
        item.titleText.setColor('#FFFFFF');
      } else {
        item.bgBox.setFillStyle(0x1A1A24, 0.9);
        item.bgBox.setStrokeStyle(2, 0x38384D);
        item.titleText.setColor(item.mode.active ? '#CCCCCC' : '#555566');
      }
    });
  }

  update() {
    const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wKey);
    const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.sKey);
    const confirmPressed = Phaser.Input.Keyboard.JustDown(this.enterKey) ||
                           Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                           Phaser.Input.Keyboard.JustDown(this.jKey);

    if (upPressed) {
      AudioSynth.play('menu_move');
      this.selectedIndex = (this.selectedIndex - 1 + this.modes.length) % this.modes.length;
      this.updateSelectionVisuals();
    } else if (downPressed) {
      AudioSynth.play('menu_move');
      this.selectedIndex = (this.selectedIndex + 1) % this.modes.length;
      this.updateSelectionVisuals();
    }

    if (confirmPressed) {
      const chosen = this.modes[this.selectedIndex];
      if (!chosen.active) {
        AudioSynth.play('block');
        // Efeito de shake se selecionar o modo LAN antes da Fase 3
        this.cameras.main.shake(100, 0.005);
        return;
      }

      AudioSynth.play('menu_select');
      this.cameras.main.fade(200, 13, 13, 18);
      this.time.delayedCall(200, () => {
        this.scene.start('CharSelectScene', { mode: chosen.id });
      });
    }
  }
}
