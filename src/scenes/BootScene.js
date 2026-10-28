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

    // Carregar Capa e Cenários de Batalha (Estilo Mortal Kombat)
    this.load.image('cover_title', '/assets/stages/cover.jpg');
    this.load.image('stage_ruinas', '/assets/stages/stage_ruinas.jpg');
    this.load.image('stage_itaipu', '/assets/stages/stage_itaipu.jpg');
    this.load.image('stage_panteon', '/assets/stages/stage_panteon.jpg');
    this.load.image('stage_chaco', '/assets/stages/stage_chaco.jpg');
    this.load.image('stage_defensores', '/assets/stages/stage_defensores.jpg');

    // Lista dos 5 lutadores com assets completos
    const activeFightersWithAssets = ['chilavert', 'roque', 'larissa', 'solano', 'mangore', 'cabanas', 'pombero', 'nanduti', 'terere_master', 'itaipu_colossus'];
    this.registry.set('activeFightersWithAssets', activeFightersWithAssets);

    const animList = [
      'idle', 'walk_forward', 'walk_backward', 'crouch', 'jump',
      'light_punch', 'heavy_punch', 'light_kick', 'heavy_kick',
      'special_1', 'special_2', 'super_attack', 'block', 'hit_stun',
      'victory_pose', 'defeat_ko',
    ];

    activeFightersWithAssets.forEach((id) => {
      ['p1', 'p2'].forEach((pal) => {
        // Carregar Portraits P1 e P2
        this.load.image(`portrait_${id}_${pal}`, `/assets/fighters/${id}/${id}_${pal}_portrait.png`);

        // Carregar cada tira de animação (256x240 por frame)
        animList.forEach((animKey) => {
          this.load.spritesheet(`${id}_${pal}_${animKey}`, `/assets/fighters/${id}/${pal}/${animKey}.png`, {
            frameWidth: 256,
            frameHeight: 240,
          });
        });
      });
    });

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

    // Gerar animações dos lutadores a partir dos spritesheets
    this.createFighterAnimations();

    // Gerar texturas geométricas base para partículas caso necessário
    this.createPlaceholderTextures();

    // Transição suave para a cena de título
    this.time.delayedCall(300, () => {
      this.scene.start('TitleScene');
    });
  }

  createFighterAnimations() {
    const activeFighters = ['chilavert', 'roque', 'larissa', 'solano', 'mangore', 'cabanas', 'pombero', 'nanduti', 'terere_master', 'itaipu_colossus'];
    const animConfig = [
      { key: 'idle', fps: 10, loop: true },
      { key: 'walk_forward', fps: 14, loop: true },
      { key: 'walk_backward', fps: 14, loop: true },
      { key: 'crouch', fps: 10, loop: true },
      { key: 'jump', fps: 10, loop: false },
      { key: 'light_punch', fps: 14, loop: false },
      { key: 'heavy_punch', fps: 14, loop: false },
      { key: 'light_kick', fps: 14, loop: false },
      { key: 'heavy_kick', fps: 14, loop: false },
      { key: 'special_1', fps: 14, loop: false },
      { key: 'special_2', fps: 14, loop: false },
      { key: 'super_attack', fps: 14, loop: false },
      { key: 'block', fps: 10, loop: true },
      { key: 'hit_stun', fps: 12, loop: false },
      { key: 'victory_pose', fps: 10, loop: true },
      { key: 'defeat_ko', fps: 10, loop: false },
    ];

    activeFighters.forEach((fighterId) => {
      ['p1', 'p2'].forEach((palette) => {
        animConfig.forEach((anim) => {
          const textureKey = `${fighterId}_${palette}_${anim.key}`;
          if (this.textures.exists(textureKey)) {
            if (this.anims.exists(textureKey)) {
              this.anims.remove(textureKey);
            }
            this.anims.create({
              key: textureKey,
              frames: this.anims.generateFrameNumbers(textureKey),
              frameRate: anim.fps,
              repeat: anim.loop ? -1 : 0,
            });
          }
        });
      });
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
