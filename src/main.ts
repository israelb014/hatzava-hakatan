import Phaser from 'phaser';
import './style.css';
import { G, W, H, initSave } from './core';
import { audio } from './audio';
import { BootScene } from './scenes/Boot';
import { HomeScene } from './scenes/Home';
import { MapScene } from './scenes/Map';
import { ArmyScene } from './scenes/Army';
import { HeroScene } from './scenes/Hero';
import { QuestsScene } from './scenes/Quests';
import { BattleScene } from './scenes/Battle';
import { initPlatform } from './platform';

async function start() {
  try {
    await Promise.all([
      document.fonts.load('700 20px Rubik', 'אבג 123'),
      document.fonts.load('900 20px Rubik', 'אבג 123'),
      document.fonts.load('700 20px Rubik', '0123'),
      document.fonts.load('900 20px Rubik', '0123'),
    ]);
  } catch {
    /* ממשיכים עם גופן המערכת */
  }
  initSave();
  // רזולוציה פנימית לפי המסך: חד במסכים גדולים, קל במכשירים חלשים
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const screenH = Math.min(window.innerWidth, window.innerHeight) * dpr;
  const screenW = Math.max(window.innerWidth, window.innerHeight) * dpr;
  G.res = Math.round(Phaser.Math.Clamp(Math.min(screenH / H, screenW / W), 1, 1.5) * 100) / 100;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#3a2415',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: Math.round(W * G.res), height: Math.round(H * G.res) },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 4 },
    fps: { target: 60 },
    banner: false,
    scene: [BootScene, HomeScene, MapScene, ArmyScene, HeroScene, QuestsScene, BattleScene],
  });
  (window as unknown as { __game: Phaser.Game; __G: typeof G }).__game = game;
  (window as unknown as { __G: typeof G }).__G = G;

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));
  initPlatform();
}

void start();
