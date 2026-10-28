// src/scenes/CharSelectScene.js
// Tela de Seleção dos Lutadores do KUARAHY (Grade 5x2 de 10 Lutadores com Portraits e P1/P2 Mirror Match)

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

    // Fundo arcade escuro
    this.add.rectangle(width / 2, height / 2, width, height, 0x0D0D12);

    // Carregar fighters do registry
    this.fighters = this.registry.get('fightersData') || [];

    // Título Superior
    this.add.text(width / 2, 35, 'SELEÇÃO DE LUTADORES', {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#E8B33A',
      letterSpacing: '6px',
    }).setOrigin(0.5, 0.5);

    this.modeLabel = this.add.text(width / 2, 65, `MODO: ${this.gameMode.toUpperCase()}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4A90C2',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    // Estado da seleção inicial: P1 inicia em Salvador Cabañas (index 5)
    this.p1Index = this.fighters.findIndex(f => f.id === 'cabanas');
    if (this.p1Index === -1) this.p1Index = 0;

    // P2 inicia em Itaipu Colossus (index 9)
    this.p2Index = this.fighters.findIndex(f => f.id === 'itaipu_colossus');
    if (this.p2Index === -1) this.p2Index = Math.min(1, this.fighters.length - 1);

    this.p1Confirmed = false;
    this.p2Confirmed = this.gameMode === 'arcade' || this.gameMode === 'training';

    // Criação dos painéis de prévia lateral dos lutadores (P1 à esquerda, P2 à direita)
    this.createPreviewPanels(width, height);

    // Grade 5x2 no centro
    this.gridContainers = [];
    this.createGrid(width, height);

    // Configuração de Inputs
    this.setupControls();

    // Rodapé de instruções
    this.footerText = this.add.text(width / 2, height - 30, 
      this.gameMode === 'arcade'
        ? 'P1: [SETAS ou W/A/S/D] MOVER  |  [ENTER / J / CLIQUE] CONFIRMAR'
        : 'P1: [W/A/S/D]+[J] CONFIRMAR   |   P2: [SETAS]+[NUM1 / ENTER] CONFIRMAR', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#A0A0B2',
      letterSpacing: '2px',
    }).setOrigin(0.5, 0.5);

    this.updateSelectionHighlights();
    this.updatePreviews();
  }

  createGrid(width, height) {
    const numCols = 5;
    const gapX = 98;
    const gapY = 126;
    const startX = width / 2 - 2 * gapX;
    const startY = 160;

    this.fighters.forEach((fighter, idx) => {
      const col = idx % numCols;
      const row = Math.floor(idx / numCols);
      const posX = startX + col * gapX;
      const posY = startY + row * gapY;

      const container = this.add.container(posX, posY);

      // Card de fundo interativo
      const cardBg = this.add.rectangle(0, 0, 90, 114, 0x1A1A24);
      cardBg.setStrokeStyle(2, 0x38384D);
      cardBg.setInteractive({ useHandCursor: true });

      // Clique ou toque direto no lutador para selecionar
      cardBg.on('pointerdown', () => {
        AudioSynth.play('menu_move');
        this.p1Index = idx;
        this.updateSelectionHighlights();
        this.updatePreviews();

        // Se for o segundo clique, confirma
        if (this.lastClickedIdx === idx) {
          this.confirmP1();
        } else {
          this.lastClickedIdx = idx;
        }
      });

      // Miniatura / Portrait do Lutador
      const portraitKey = `portrait_${fighter.id}_p1`;
      let portraitObj;
      if (this.textures.exists(portraitKey)) {
        portraitObj = this.add.image(0, -14, portraitKey);
        portraitObj.setDisplaySize(78, 70);
      } else {
        const colorNum = parseInt(fighter.color.replace('#', '0x'), 16);
        portraitObj = this.add.rectangle(0, -14, 78, 70, colorNum);
        portraitObj.setStrokeStyle(1, 0x0D0D12);
      }

      // Rótulo do Nome
      const displayName = fighter.name.split(' ')[0];
      const nameText = this.add.text(0, 36, displayName.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      // Indicadores P1 e P2 (cursores sobre o card)
      const p1Cursor = this.add.rectangle(-32, -44, 18, 16, 0x2A5A8B);
      const p1CursorText = this.add.text(-32, -44, '1P', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      const p2Cursor = this.add.rectangle(32, -44, 18, 16, 0xC8102E);
      const p2CursorText = this.add.text(32, -44, '2P', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5, 0.5);

      container.add([cardBg, portraitObj, nameText, p1Cursor, p1CursorText, p2Cursor, p2CursorText]);

      this.gridContainers.push({
        container,
        cardBg,
        portraitObj,
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
    this.p1Panel = this.add.container(120, height / 2 + 10);
    const p1Card = this.add.rectangle(0, 0, 180, 320, 0x121219);
    p1Card.setStrokeStyle(2, 0x2A5A8B);

    this.p1PortraitFallback = this.add.rectangle(0, -65, 120, 140, 0x2E8B57);
    this.p1PortraitFallback.setStrokeStyle(2, 0x0D0D12);
    this.p1PortraitImage = this.add.image(0, -65, '').setDisplaySize(120, 140).setVisible(false);

    this.p1Name = this.add.text(0, 22, 'CABAÑAS', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    this.p1Title = this.add.text(0, 40, 'EL CHAVA INDOMÁVEL', {
      fontFamily: 'monospace', fontSize: '9px', color: '#E8B33A',
    }).setOrigin(0.5, 0.5);

    this.p1StatsText = this.add.text(-70, 58, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#4A90C2', lineHeight: 13,
    });

    this.p1Status = this.add.text(0, 134, 'SELECIONANDO...', {
      fontFamily: 'monospace', fontSize: '11px', color: '#4A90C2', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.p1Panel.add([
      p1Card,
      this.p1PortraitFallback,
      this.p1PortraitImage,
      this.p1Name,
      this.p1Title,
      this.p1StatsText,
      this.p1Status,
    ]);

    // Painel Direito (P2)
    this.p2Panel = this.add.container(width - 120, height / 2 + 10);
    const p2Card = this.add.rectangle(0, 0, 180, 320, 0x121219);
    p2Card.setStrokeStyle(2, 0xC8102E);

    this.p2PortraitFallback = this.add.rectangle(0, -65, 120, 140, 0xC8102E);
    this.p2PortraitFallback.setStrokeStyle(2, 0x0D0D12);
    this.p2PortraitImage = this.add.image(0, -65, '').setDisplaySize(120, 140).setVisible(false);

    this.p2Name = this.add.text(0, 22, 'ITAIPU', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    this.p2Title = this.add.text(0, 40, 'COLOSSO HIDRÁULICO', {
      fontFamily: 'monospace', fontSize: '9px', color: '#E8B33A',
    }).setOrigin(0.5, 0.5);

    this.p2StatsText = this.add.text(-70, 58, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#C8102E', lineHeight: 13,
    });

    this.p2Status = this.add.text(0, 134, this.gameMode === 'arcade' ? 'CPU PRONTA' : 'SELECIONANDO...', {
      fontFamily: 'monospace', fontSize: '11px', color: '#C8102E', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.p2Panel.add([
      p2Card,
      this.p2PortraitFallback,
      this.p2PortraitImage,
      this.p2Name,
      this.p2Title,
      this.p2StatsText,
      this.p2Status,
    ]);
  }

  setupControls() {
    this.keys = this.input.keyboard.addKeys({
      // Setas direcionais
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      // WASD
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      // Confirmação
      j: Phaser.Input.Keyboard.KeyCodes.J,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      num1: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
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
    // P1 Preview
    const f1 = this.fighters[this.p1Index];
    if (f1) {
      this.p1Name.setText(f1.name.toUpperCase());
      this.p1Title.setText((f1.title || f1.archetype).toUpperCase());

      const portraitP1 = `portrait_${f1.id}_p1`;
      if (this.textures.exists(portraitP1)) {
        this.p1PortraitImage.setTexture(portraitP1);
        this.p1PortraitImage.setDisplaySize(120, 140);
        this.p1PortraitImage.setVisible(true);
        this.p1PortraitFallback.setVisible(false);
      } else {
        this.p1PortraitFallback.setFillStyle(parseInt(f1.color.replace('#', '0x'), 16)).setVisible(true);
        this.p1PortraitImage.setVisible(false);
      }

      this.p1StatsText.setText(
        `DANO:    ${'■'.repeat(f1.stats.damage)}${'□'.repeat(5 - f1.stats.damage)}\n` +
        `VELOC.:  ${'■'.repeat(f1.stats.speed)}${'□'.repeat(5 - f1.stats.speed)}\n` +
        `DEFESA:  ${'■'.repeat(f1.stats.defense)}${'□'.repeat(5 - f1.stats.defense)}\n` +
        `ALCANCE: ${'■'.repeat(f1.stats.range)}${'□'.repeat(5 - f1.stats.range)}`
      );
    }

    // P2 Preview
    const f2 = this.fighters[this.p2Index];
    if (f2) {
      const isMirror = this.p1Index === this.p2Index;
      this.p2Name.setText(isMirror ? `${f2.name.toUpperCase()} (P2 ALT)` : f2.name.toUpperCase());
      this.p2Title.setText(isMirror ? 'PALETA ESPELHO (COR 2)' : (f2.title || f2.archetype).toUpperCase());

      const portraitP2 = `portrait_${f2.id}_${isMirror ? 'p2' : 'p2'}`;
      if (this.textures.exists(portraitP2)) {
        this.p2PortraitImage.setTexture(portraitP2);
        this.p2PortraitImage.setDisplaySize(120, 140);
        this.p2PortraitImage.setVisible(true);
        this.p2PortraitFallback.setVisible(false);
      } else {
        this.p2PortraitFallback.setFillStyle(parseInt(f2.color.replace('#', '0x'), 16)).setVisible(true);
        this.p2PortraitImage.setVisible(false);
      }

      this.p2StatsText.setText(
        `DANO:    ${'■'.repeat(f2.stats.damage)}${'□'.repeat(5 - f2.stats.damage)}\n` +
        `VELOC.:  ${'■'.repeat(f2.stats.speed)}${'□'.repeat(5 - f2.stats.speed)}\n` +
        `DEFESA:  ${'■'.repeat(f2.stats.defense)}${'□'.repeat(5 - f2.stats.defense)}\n` +
        `ALCANCE: ${'■'.repeat(f2.stats.range)}${'□'.repeat(5 - f2.stats.range)}`
      );
    }
  }

  update() {
    const total = this.fighters.length;
    const cols = 5;

    // Controle P1: aceita TANTO setas do teclado quanto W/A/S/D
    if (!this.p1Confirmed) {
      const leftPressed = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
      const rightPressed = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);
      const upPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
      const downPressed = Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);
      const confirmPressed = Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
                             Phaser.Input.Keyboard.JustDown(this.keys.space) ||
                             Phaser.Input.Keyboard.JustDown(this.keys.j) ||
                             Phaser.Input.Keyboard.JustDown(this.keys.num1);

      if (leftPressed) {
        AudioSynth.play('menu_move');
        const col = this.p1Index % cols;
        this.p1Index = col === 0 ? this.p1Index + (cols - 1) : this.p1Index - 1;
        if (this.p1Index >= total) this.p1Index = total - 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (rightPressed) {
        AudioSynth.play('menu_move');
        const col = this.p1Index % cols;
        this.p1Index = col === cols - 1 ? this.p1Index - (cols - 1) : this.p1Index + 1;
        if (this.p1Index >= total) this.p1Index = total - 1;
        this.updateSelectionHighlights();
        this.updatePreviews();
      } else if (upPressed || downPressed) {
        AudioSynth.play('menu_move');
        this.p1Index = (this.p1Index + cols) % total;
        this.updateSelectionHighlights();
        this.updatePreviews();
      }

      if (confirmPressed) {
        this.confirmP1();
      }
    }
  }

  confirmP1() {
    AudioSynth.play('menu_select');
    this.p1Confirmed = true;
    this.p1Status.setText('PRONTO!').setColor('#7FBF4F');

    const total = this.fighters.length;
    if (this.gameMode === 'arcade') {
      // No modo Arcade, a CPU escolhe um adversário aleatório diferente de P1
      let cpuIdx = Phaser.Math.Between(0, total - 1);
      // Permite duelo espelho (shadow mirror match) se calhar no mesmo lutador
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
