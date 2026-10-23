// src/scenes/CharSelectScene.js
// Tela de Seleção dos 6 Lutadores do KUARAHY (Grade 3x2 com Stats em barras)

import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class CharSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharSelectScene' });
  }

  init(data) {
    this.gameMode = data.mode || 'arcade';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fundo
    this.add.rectangle(width / 2, height / 2, width, height, 0x0D0D12);

    // Carregar fighters do registry
    this.fighters = this.registry.get('fightersData') || [];

    // Título Superior
    this.add.text(width / 2, 40, 'SELEÇÃO DE LUTADORES', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#E8B33A',
      letterSpacing: '6px',
    }).setOrigin(0.5, 0.5);

    this.modeLabel = this.add.text(width / 2, 70, `MODO: ${this.gameMode.toUpperCase()}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4A90C2',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    // Estado da seleção
    this.p1Index = 0;
    this.p2Index = this.gameMode === 'arcade' ? 1 : 5;
    this.p1Confirmed = false;
    this.p2Confirmed = this.gameMode === 'arcade' || this.gameMode === 'training';

    // Criação dos painéis de prévia lateral dos lutadores (P1 à esquerda, P2 à direita)
    this.createPreviewPanels(width, height);

    // Grade 3x2 no centro
    this.gridContainers = [];
    this.createGrid(width, height);

    // Configuração de Inputs
    this.setupControls();

    // Rodapé de instruções
    this.footerText = this.add.text(width / 2, height - 35, 
      this.gameMode === 'arcade'
        ? 'P1: [W/A/S/D] MOVER  |  [J] CONFIRMAR'
        : 'P1: [W/A/S/D]+[J] CONFIRMAR   |   P2: [SETAS]+[NUM1 / L] CONFIRMAR', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#A0A0B2',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    this.updateSelectionHighlights();
    this.updatePreviews();
  }

  createGrid(width, height) {
    const startX = width / 2 - 140;
    const startY = 160;
    const gapX = 140;
    const gapY = 120;

    this.fighters.forEach((fighter, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const posX = startX + col * gapX;
      const posY = startY + row * gapY;

      const container = this.add.container(posX, posY);

      // Card de fundo
      const cardBg = this.add.rectangle(0, 0, 120, 100, 0x1A1A24);
      cardBg.setStrokeStyle(2, 0x38384D);

      // Mini silhueta geométrica pixel
      const colorNum = parseInt(fighter.color.replace('#', '0x'), 16);
      const portraitBox = this.add.rectangle(0, -10, 80, 56, colorNum);
      portraitBox.setStrokeStyle(1, 0x0D0D12);

      // Rótulo do Nome
      const nameText = this.add.text(0, 32, fighter.name, {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      // Indicadores P1 e P2 (cursores sobre o card)
      const p1Cursor = this.add.rectangle(-40, -36, 16, 16, 0x2A5A8B);
      const p1CursorText = this.add.text(-40, -36, '1P', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      const p2Cursor = this.add.rectangle(40, -36, 16, 16, 0xC8102E);
      const p2CursorText = this.add.text(40, -36, '2P', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      container.add([cardBg, portraitBox, nameText, p1Cursor, p1CursorText, p2Cursor, p2CursorText]);

      this.gridContainers.push({
        container,
        cardBg,
        portraitBox,
        nameText,
        p1Cursor,
        p1CursorText,
        p2Cursor,
        p2CursorText,
      });
    });
  }

  createPreviewPanels(width, height) {
    // Painel Esquerdo (P1)
    this.p1Panel = this.add.container(110, height / 2 + 10);
    const p1Card = this.add.rectangle(0, 0, 170, 310, 0x121219);
    p1Card.setStrokeStyle(2, 0x2A5A8B);
    this.p1Portrait = this.add.rectangle(0, -60, 110, 140, 0x2E8B57);
    this.p1Portrait.setStrokeStyle(2, 0x0D0D12);
    this.p1Name = this.add.text(0, 25, 'TERERÉ', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);
    this.p1Archetype = this.add.text(0, 45, 'ALL-ROUNDER', {
      fontFamily: 'monospace', fontSize: '10px', color: '#4A90C2',
    }).setOrigin(0.5, 0.5);
    this.p1StatsText = this.add.text(-65, 65, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#E8B33A', lineHeight: 14,
    });
    this.p1Status = this.add.text(0, 130, 'SELECIONANDO...', {
      fontFamily: 'monospace', fontSize: '11px', color: '#4A90C2', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.p1Panel.add([p1Card, this.p1Portrait, this.p1Name, this.p1Archetype, this.p1StatsText, this.p1Status]);

    // Painel Direito (P2)
    this.p2Panel = this.add.container(width - 110, height / 2 + 10);
    const p2Card = this.add.rectangle(0, 0, 170, 310, 0x121219);
    p2Card.setStrokeStyle(2, 0xC8102E);
    this.p2Portrait = this.add.rectangle(0, -60, 110, 140, 0xC8102E);
    this.p2Portrait.setStrokeStyle(2, 0x0D0D12);
    this.p2Name = this.add.text(0, 25, 'GUARANI', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);
    this.p2Archetype = this.add.text(0, 45, 'TÉCNICO', {
      fontFamily: 'monospace', fontSize: '10px', color: '#C8102E',
    }).setOrigin(0.5, 0.5);
    this.p2StatsText = this.add.text(-65, 65, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#E8B33A', lineHeight: 14,
    });
    this.p2Status = this.add.text(0, 130, this.gameMode === 'arcade' ? 'CPU PRONTA' : 'SELECIONANDO...', {
      fontFamily: 'monospace', fontSize: '11px', color: '#C8102E', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.p2Panel.add([p2Card, this.p2Portrait, this.p2Name, this.p2Archetype, this.p2StatsText, this.p2Status]);
  }

  setupControls() {
    // P1 (W/A/S/D + J soco ou Enter)
    this.p1Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      confirm: Phaser.Input.Keyboard.KeyCodes.J,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // P2 (Setas + Numpad1 ou L / K)
    this.p2Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      confirmNumpad: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      confirmL: Phaser.Input.Keyboard.KeyCodes.L,
    });
  }

  updateSelectionHighlights() {
    this.gridContainers.forEach((card, idx) => {
      const isP1 = idx === this.p1Index;
      const isP2 = idx === this.p2Index;

      card.p1Cursor.setVisible(isP1);
      card.p1CursorText.setVisible(isP1);
      card.p2Cursor.setVisible(isP2);
      card.p2CursorText.setVisible(isP2);

      if (isP1 && isP2) {
        card.cardBg.setStrokeStyle(3, 0xE8B33A);
      } else if (isP1) {
        card.cardBg.setStrokeStyle(2, 0x4A90C2);
      } else if (isP2) {
        card.cardBg.setStrokeStyle(2, 0xC8102E);
      } else {
        card.cardBg.setStrokeStyle(2, 0x38384D);
      }
    });
  }

  updatePreviews() {
    const f1 = this.fighters[this.p1Index];
    if (f1) {
      this.p1Name.setText(f1.name);
      this.p1Archetype.setText(f1.archetype.toUpperCase());
      this.p1Portrait.setFillStyle(parseInt(f1.color.replace('#', '0x'), 16));
      this.p1StatsText.setText(
        `DANO:    ${'■'.repeat(f1.stats.damage)}${'□'.repeat(5 - f1.stats.damage)}\n` +
        `VELOC.:  ${'■'.repeat(f1.stats.speed)}${'□'.repeat(5 - f1.stats.speed)}\n` +
        `DEFESA:  ${'■'.repeat(f1.stats.defense)}${'□'.repeat(5 - f1.stats.defense)}\n` +
        `ALCANCE: ${'■'.repeat(f1.stats.range)}${'□'.repeat(5 - f1.stats.range)}`
      );
    }

    const f2 = this.fighters[this.p2Index];
    if (f2) {
      this.p2Name.setText(f2.name);
      this.p2Archetype.setText(f2.archetype.toUpperCase());
      this.p2Portrait.setFillStyle(parseInt(f2.color.replace('#', '0x'), 16));
      this.p2StatsText.setText(
        `DANO:    ${'■'.repeat(f2.stats.damage)}${'□'.repeat(5 - f2.stats.damage)}\n` +
        `VELOC.:  ${'■'.repeat(f2.stats.speed)}${'□'.repeat(5 - f2.stats.speed)}\n` +
        `DEFESA:  ${'■'.repeat(f2.stats.defense)}${'□'.repeat(5 - f2.stats.defense)}\n` +
        `ALCANCE: ${'■'.repeat(f2.stats.range)}${'□'.repeat(5 - f2.stats.range)}`
      );
    }
  }

  update() {
    // Controle P1
    if (!this.p1Confirmed) {
      if (Phaser.Input.Keyboard.JustDown(this.p1Keys.left)) {
        AudioSynth.play('menu_move');
        this.p1Index = this.p1Index % 3 === 0 ? this.p1Index + 2 : this.p1Index - 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (Phaser.Input.Keyboard.JustDown(this.p1Keys.right)) {
        AudioSynth.play('menu_move');
        this.p1Index = this.p1Index % 3 === 2 ? this.p1Index - 2 : this.p1Index + 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (Phaser.Input.Keyboard.JustDown(this.p1Keys.up) || Phaser.Input.Keyboard.JustDown(this.p1Keys.down)) {
        AudioSynth.play('menu_move');
        this.p1Index = (this.p1Index + 3) % 6;
        this.updateSelectionHighlights();
        this.updatePreviews();
      }

      if (Phaser.Input.Keyboard.JustDown(this.p1Keys.confirm) ||
          Phaser.Input.Keyboard.JustDown(this.p1Keys.enter) ||
          Phaser.Input.Keyboard.JustDown(this.p1Keys.space)) {
        AudioSynth.play('menu_select');
        this.p1Confirmed = true;
        this.p1Status.setText('PRONTO!').setColor('#7FBF4F');

        if (this.gameMode === 'arcade') {
          // No modo Arcade, a CPU escolhe um oponente automaticamente (diferente do P1)
          let cpuIdx = Phaser.Math.Between(0, 5);
          if (cpuIdx === this.p1Index) cpuIdx = (cpuIdx + 1) % 6;
          this.p2Index = cpuIdx;
          this.p2Confirmed = true;
          this.updatePreviews();
          this.checkStartFight();
        } else if (this.gameMode === 'training') {
          this.p2Confirmed = true;
          this.checkStartFight();
        } else {
          this.checkStartFight();
        }
      }
    }

    // Controle P2 (se versus 2P local)
    if (this.gameMode === 'versus' && !this.p2Confirmed) {
      if (Phaser.Input.Keyboard.JustDown(this.p2Keys.left)) {
        AudioSynth.play('menu_move');
        this.p2Index = this.p2Index % 3 === 0 ? this.p2Index + 2 : this.p2Index - 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (Phaser.Input.Keyboard.JustDown(this.p2Keys.right)) {
        AudioSynth.play('menu_move');
        this.p2Index = this.p2Index % 3 === 2 ? this.p2Index - 2 : this.p2Index + 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (Phaser.Input.Keyboard.JustDown(this.p2Keys.up) || Phaser.Input.Keyboard.JustDown(this.p2Keys.down)) {
        AudioSynth.play('menu_move');
        this.p2Index = (this.p2Index + 3) % 6;
        this.updateSelectionHighlights();
        this.updatePreviews();
      }

      if (Phaser.Input.Keyboard.JustDown(this.p2Keys.confirmNumpad) ||
          Phaser.Input.Keyboard.JustDown(this.p2Keys.confirmL)) {
        AudioSynth.play('menu_select');
        this.p2Confirmed = true;
        this.p2Status.setText('PRONTO!').setColor('#7FBF4F');
        this.checkStartFight();
      }
    }
  }

  checkStartFight() {
    if (this.p1Confirmed && this.p2Confirmed) {
      this.footerText.setText('LUTADORES CONFIRMADOS! ENTRANDO NA ARENA...').setColor('#E8B33A');
      this.cameras.main.fade(300, 13, 13, 18);
      this.time.delayedCall(300, () => {
        this.scene.start('FightScene', {
          p1: this.fighters[this.p1Index],
          p2: this.fighters[this.p2Index],
          mode: this.gameMode,
        });
      });
    }
  }
}
