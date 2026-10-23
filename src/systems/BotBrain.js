// src/systems/BotBrain.js
// Inteligência Artificial do CPU para o Modo Arcade com Percepção Limitada

const BotState = {
  IDLE: 'IDLE',
  APPROACH: 'APPROACH',
  ATTACK: 'ATTACK',
  BLOCK: 'BLOCK',
  RETREAT: 'RETREAT',
  SPECIAL: 'SPECIAL',
  RECOVER: 'RECOVER',
};

export class BotBrain {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;

    // Configurações por dificuldade
    switch (difficulty) {
      case 'easy':
        this.decisionInterval = 6;  // Decisão a cada 6 frames
        this.reactionDelay = 20;    // Atraso de reação de 20 frames (~330ms)
        this.blockChance = 0.35;
        this.counterChance = 0.10;
        this.specialChance = 0.20;
        break;

      case 'hard':
        this.decisionInterval = 1;  // Decisão a cada 1 frame
        this.reactionDelay = 4;     // Atraso de reação de 4 frames (~66ms)
        this.blockChance = 0.85;
        this.counterChance = 0.50;
        this.specialChance = 0.70;
        break;

      case 'normal':
      default:
        this.decisionInterval = 3;  // Decisão a cada 3 frames
        this.reactionDelay = 10;    // Atraso de reação de 10 frames (~160ms)
        this.blockChance = 0.60;
        this.counterChance = 0.25;
        this.specialChance = 0.45;
        break;
    }

    this.state = BotState.IDLE;
    this.frameCounter = 0;
    this.reactionCounter = 0;
    this.currentIntent = {
      up: false,
      down: false,
      left: false,
      right: false,
      punch: false,
      punchHeavy: false,
      kick: false,
      kickHeavy: false,
      special1: false,
      special2: false,
      superMove: false,
      throw: false,
      block: false,
    };
  }

  resetInputs() {
    this.currentIntent = {
      up: false,
      down: false,
      left: false,
      right: false,
      punch: false,
      punchHeavy: false,
      kick: false,
      kickHeavy: false,
      special1: false,
      special2: false,
      superMove: false,
      throw: false,
      block: false,
    };
  }

  /**
   * Atualiza a lógica de IA lendo APENAS a percepção do mundo (sem ler os inputs do oponente).
   * @param {Fighter} bot 
   * @param {Fighter} opponent 
   * @param {number} roundTimer 
   * @returns {Object} inputs virtuais para o bot
   */
  update(bot, opponent, roundTimer) {
    this.frameCounter++;

    // Pulsação e limpeza de inputs de golpe (evita segurar botões indefinidamente)
    this.currentIntent.punch = false;
    this.currentIntent.punchHeavy = false;
    this.currentIntent.kick = false;
    this.currentIntent.kickHeavy = false;
    this.currentIntent.special1 = false;
    this.currentIntent.special2 = false;
    this.currentIntent.superMove = false;
    this.currentIntent.throw = false;

    // Se o bot estiver em Hitstun, Stun ou KO, não toma ações
    if (bot.state === 'HIT_STUN' || bot.state === 'KO' || bot.state === 'COUNTER') {
      this.resetInputs();
      return this.currentIntent;
    }

    // Intervalo de decisão respeitado
    if (this.frameCounter % this.decisionInterval !== 0) {
      return this.currentIntent;
    }

    // Percepção limitada: distância absoluta e direção
    const dx = opponent.container.x - bot.container.x;
    const distance = Math.abs(dx);
    const opponentIsLeft = dx < 0;

    // Percepção de saúde e energia
    const botHealthRatio = bot.health / bot.maxHealth;
    const oppHealthRatio = opponent.health / opponent.maxHealth;
    const botHasSuper = bot.meter >= 100;

    // Percepção do estado do oponente (sem ler input, apenas animação/estado atual)
    const opponentIsAttacking = opponent.state === 'ATTACK';
    const opponentIsCrouched = opponent.state === 'CROUCH';
    const opponentIsRecovering = opponent.state === 'HIT_STUN';

    // 1. REAÇÃO A ATAQUES DO OPONENTE (Defesa ou Contra)
    if (opponentIsAttacking && distance < 110) {
      this.reactionCounter++;
      if (this.reactionCounter >= this.reactionDelay) {
        if (Math.random() < this.blockChance) {
          this.state = BotState.BLOCK;
          this.currentIntent.block = true;
          this.currentIntent.down = opponentIsCrouched;

          // Tentativa de Contra / Parry
          if (bot.meter >= 25 && Math.random() < this.counterChance) {
            this.currentIntent.block = true; // Aciona a janela de 4 frames
          }
          return this.currentIntent;
        }
      }
    } else {
      this.reactionCounter = 0;
      this.currentIntent.block = false;
    }

    // 2. DECISÃO DE SUPER GOLPE
    if (botHasSuper && distance < 120 && Math.random() < 0.6) {
      this.resetInputs();
      this.currentIntent.superMove = true;
      return this.currentIntent;
    }

    // 3. TRANSIÇÃO DE ESTADOS BASEADA NA DISTÂNCIA
    if (distance > 180) {
      // Oponente longe: aproximar ou usar projétil/especial se tiver alcance
      if (bot.data.stats.range >= 4 && bot.specialCooldowns.special_1 <= 0 && Math.random() < this.specialChance) {
        this.state = BotState.SPECIAL;
        this.resetInputs();
        this.currentIntent.special1 = true;
      } else {
        this.state = BotState.APPROACH;
        this.resetInputs();
        if (opponentIsLeft) {
          this.currentIntent.left = true;
        } else {
          this.currentIntent.right = true;
        }
      }
    } else if (distance < 50) {
      // Muito perto: chance de agarrão, soco leve ou recuar
      const roll = Math.random();
      this.resetInputs();

      if (roll < 0.25) {
        this.state = BotState.ATTACK;
        this.currentIntent.throw = true;
      } else if (roll < 0.65) {
        this.state = BotState.ATTACK;
        this.currentIntent.punch = true;
      } else {
        this.state = BotState.RETREAT;
        if (opponentIsLeft) {
          this.currentIntent.right = true;
        } else {
          this.currentIntent.left = true;
        }
      }
    } else {
      // Distância média (50 a 180 px): zona de combate ativo
      this.resetInputs();
      const roll = Math.random();

      if (roll < 0.35) {
        // Sequência de golpe normal
        this.state = BotState.ATTACK;
        if (Math.random() < 0.5) {
          this.currentIntent.punch = true;
        } else {
          this.currentIntent.kick = true;
        }
      } else if (roll < 0.60) {
        // Golpe pesado
        this.state = BotState.ATTACK;
        if (Math.random() < 0.5) {
          this.currentIntent.punchHeavy = true;
        } else {
          this.currentIntent.kickHeavy = true;
        }
      } else if (roll < 0.80 && bot.specialCooldowns.special_1 <= 0) {
        // Especial 1
        this.state = BotState.SPECIAL;
        this.currentIntent.special1 = true;
      } else if (roll < 0.92 && bot.specialCooldowns.special_2 <= 0) {
        // Especial 2
        this.state = BotState.SPECIAL;
        this.currentIntent.special2 = true;
      } else {
        // Fintar movimentando-se para frente
        this.state = BotState.APPROACH;
        if (opponentIsLeft) {
          this.currentIntent.left = true;
        } else {
          this.currentIntent.right = true;
        }
      }
    }

    return this.currentIntent;
  }
}

export function createBrain(difficulty = 'normal') {
  return new BotBrain(difficulty);
}

export default BotBrain;
