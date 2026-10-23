// src/scenes/BootScene.js
// Cena de inicialização e carregamento de dados do KUARAHY

import AudioSynth from '../systems/AudioSynth.js';

const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Carregar os dados de framedata e atributos dos lutadores
    this.load.json('fightersData', '/src/data/fighters.json');

    // Barra de progresso de inicialização
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1A1A24, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 35, 'INICIALIZANDO KUARAHY...', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#E8B33A',
    }).setOrigin(0.5, 0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x2E8B57, 1);
      progressBar.fillRect(width / 2 - 156, height / 2 - 11, 312 * value, 22);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    // Inicializar o sintetizador de áudio no primeiro clique/tecla
    const initAudio = () => {
      AudioSynth.init();
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('pointerdown', initAudio);
    };
    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('pointerdown', initAudio, { once: true });

    // Salvar dados no registry global do Phaser para acesso em todas as cenas
    const fightersData = this.cache.json.get('fightersData');
    this.registry.set('fightersData', fightersData);

    // Gerar texturas geométricas base para lutadores e partículas caso necessário
    this.createPlaceholderTextures();

    // Transição suave para a cena de título
    this.time.delayedCall(300, () => {
      this.scene.start('TitleScene');
    });
  }

  createPlaceholderTextures() {
    // Textura de partículas de impacto (pixel 4x4)
    const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    particleGraphics.fillStyle(0xFFFFFF, 1);
    particleGraphics.fillRect(0, 0, 4, 4);
    particleGraphics.generateTexture('pixel_particle', 4, 4);

    // Textura de centelha dourada de parry
    const sparkGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGraphics.fillStyle(0xE8B33A, 1);
    sparkGraphics.fillRect(0, 0, 6, 6);
    sparkGraphics.generateTexture('parry_spark', 6, 6);
  }
}
