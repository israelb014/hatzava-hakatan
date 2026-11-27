import Phaser from 'phaser';
import './style.css';
import { G, V, H, initSave, computeView, setNativeInsets } from './core';
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
  // המשחק ממלא את כל רוחב המסך; הרזולוציה הפנימית לפי המסך
  computeView();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#3a2415',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: Math.round(V.w * G.res), height: Math.round(H * G.res) },
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
  // שינוי גודל חלון / סיבוב מסך / שולי מגרעת: מתאימים את רוחב המשחק ובונים מחדש את המסך הנוכחי
  let timer = 0;
  const relayout = () => {
    if (!computeView()) return;
    game.scale.setGameSize(Math.round(V.w * G.res), Math.round(H * G.res));
    game.scale.refresh();
    for (const sc of game.scene.getScenes(true)) {
      const key = sc.scene.key;
      if (key === 'Boot') continue;
      if (key === 'Battle') (sc as BattleScene).onResize();
      else sc.scene.restart();
    }
  };
  const queue = () => {
    clearTimeout(timer);
    timer = window.setTimeout(relayout, 180);
  };
  window.addEventListener('resize', queue);
  window.addEventListener('orientationchange', queue);
  (window as unknown as { __hkInsets: (l: number, r: number) => void }).__hkInsets = (l, r) => {
    setNativeInsets(l, r);
    queue();
  };
  initPlatform();
}

void start();
