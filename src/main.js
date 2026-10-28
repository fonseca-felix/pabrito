// src/main.js
// Ponto de entrada do Phaser 3 para o jogo de luta KUARAHY

import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import ModeSelectScene from './scenes/ModeSelectScene.js';
import CharSelectScene from './scenes/CharSelectScene.js';
import FightScene from './scenes/FightScene.js';
import TrainingScene from './scenes/TrainingScene.js';

// Obter instância do Phaser do escopo global (CDN) ou módulo
const PhaserLib = window.Phaser;

export const gameConfig = {
  type: PhaserLib.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  roundPixels: false,
  backgroundColor: '#0D0D12',
  scale: {
    mode: PhaserLib.Scale.FIT,
    autoCenter: PhaserLib.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    TitleScene,
    ModeSelectScene,
    CharSelectScene,
    FightScene,
    TrainingScene,
  ],
};

// Iniciar a instância do jogo
const game = new PhaserLib.Game(gameConfig);
export default game;
