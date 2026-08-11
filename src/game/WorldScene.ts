import Phaser from 'phaser';
import { locationById } from '../core/content';
import { HOME_POSITION } from '../core/defaultState';
import type { GameEngine } from '../core/gameEngine';
import type { Appearance } from '../core/types';
import { BUILDINGS, INTERACTIONS, WORLD_HEIGHT, WORLD_WIDTH } from './worldData';

export interface DirectionState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface WorldCallbacks {
  onNearbyLocation: (locationId: string | null) => void;
  onInteract: (locationId: string) => void;
  onLeftHome: () => void;
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private nearbyLocation: string | null = null;
  private startedAwayFromHome = false;
  readonly touch: DirectionState = { up: false, down: false, left: false, right: false };

  constructor(private readonly engine: GameEngine, private readonly callbacks: WorldCallbacks) {
    super({ key: 'world' });
  }

  create(): void {
    this.physics.world.setBounds(24, 24, WORLD_WIDTH - 48, WORLD_HEIGHT - 48);
    this.drawWorld();
    this.createPlayerTextures(this.engine.getState().player.appearance);
    const saved = this.engine.getState().player.position;
    this.player = this.physics.add.sprite(saved.x, saved.y, 'player-south-0');
    this.player.setDepth(50).setCollideWorldBounds(true);
    this.player.body?.setSize(22, 18).setOffset(7, 31);
    this.obstacles = this.physics.add.staticGroup();
    for (const building of BUILDINGS) {
      const body = this.add.rectangle(building.x + building.width / 2, building.y + building.height / 2, building.width, building.height, 0x000000, 0);
      this.physics.add.existing(body, true);
      this.obstacles.add(body);
    }
    const riverBody = this.add.rectangle(WORLD_WIDTH / 2, 970, WORLD_WIDTH, 60, 0x000000, 0);
    this.physics.add.existing(riverBody, true);
    this.obstacles.add(riverBody);
    this.physics.add.collider(this.player, this.obstacles);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input could not be initialised.');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-SPACE', () => this.interact());
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.05);
    this.cameras.main.fadeIn(450, 23, 63, 53);
  }

  update(): void {
    if (!this.player?.body) return;
    const left = this.cursors.left.isDown || this.wasd.left.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.wasd.right.isDown || this.touch.right;
    const up = this.cursors.up.isDown || this.wasd.up.isDown || this.touch.up;
    const down = this.cursors.down.isDown || this.wasd.down.isDown || this.touch.down;
    const vector = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    if (vector.lengthSq() > 0) {
      vector.normalize().scale(190);
      this.player.setVelocity(vector.x, vector.y);
      const direction = Math.abs(vector.x) > Math.abs(vector.y) ? (vector.x < 0 ? 'west' : 'east') : vector.y < 0 ? 'north' : 'south';
      this.player.play(`walk-${direction}`, true);
    } else {
      this.player.setVelocity(0, 0);
      const current = this.player.anims.currentAnim?.key?.replace('walk-', '') ?? 'south';
      this.player.setTexture(`player-${current}-0`);
    }
    const position = { x: Math.round(this.player.x * 10) / 10, y: Math.round(this.player.y * 10) / 10 };
    this.engine.updatePosition(position.x, position.y, true);
    if (!this.startedAwayFromHome && Phaser.Math.Distance.Between(position.x, position.y, HOME_POSITION.x, HOME_POSITION.y) > 110) {
      this.startedAwayFromHome = true;
      this.callbacks.onLeftHome();
    }
    this.checkNearby();
  }

  interact(): void {
    if (this.nearbyLocation) this.callbacks.onInteract(this.nearbyLocation);
  }

  pauseWorld(): void {
    this.physics.pause();
    this.player?.setVelocity(0, 0);
  }

  resumeWorld(): void {
    this.physics.resume();
  }

  syncPosition(): void {
    const point = this.engine.getState().player.position;
    this.player?.setPosition(point.x, point.y);
    this.cameras.main.centerOn(point.x, point.y);
  }

  private checkNearby(): void {
    let nearest: string | null = null;
    let nearestDistance = 72;
    for (const interaction of INTERACTIONS) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, interaction.point.x, interaction.point.y);
      if (distance < nearestDistance) {
        nearest = interaction.locationId;
        nearestDistance = distance;
      }
    }
    if (nearest === this.nearbyLocation) return;
    this.nearbyLocation = nearest;
    this.callbacks.onNearbyLocation(nearest);
  }

  private drawWorld(): void {
    this.cameras.main.setBackgroundColor(0x8fbd73);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8fbd73).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(0x6ca86f, 1).fillRoundedRect(45, 430, 320, 220, 44);
    graphics.fillStyle(0x7fb977, 1).fillCircle(150, 540, 86).fillCircle(270, 520, 78);
    graphics.fillStyle(0xcfc5ae).fillRect(0, 410, WORLD_WIDTH, 155);
    graphics.fillStyle(0xcfc5ae).fillRect(365, 0, 150, WORLD_HEIGHT);
    graphics.fillStyle(0xcfc5ae).fillRect(1080, 0, 150, WORLD_HEIGHT);
    graphics.fillStyle(0x4a5556).fillRect(0, 430, WORLD_WIDTH, 115);
    graphics.fillStyle(0x4a5556).fillRect(390, 0, 100, WORLD_HEIGHT);
    graphics.fillStyle(0x4a5556).fillRect(1105, 0, 100, WORLD_HEIGHT);
    graphics.lineStyle(4, 0xf7e8ae, 1);
    for (let x = 20; x < WORLD_WIDTH; x += 58) graphics.lineBetween(x, 487, x + 28, 487);
    graphics.lineStyle(3, 0xf7e8ae, 1);
    for (let y = 10; y < WORLD_HEIGHT; y += 52) {
      graphics.lineBetween(440, y, 440, y + 24);
      graphics.lineBetween(1155, y, 1155, y + 24);
    }
    graphics.fillStyle(0x5ca4b8).fillRect(0, 925, WORLD_WIDTH, 75);
    graphics.lineStyle(8, 0xd6caa9, 1).lineBetween(0, 908, WORLD_WIDTH, 908);
    graphics.lineStyle(4, 0x6b5a43, 1).lineBetween(0, 920, WORLD_WIDTH, 920);
    this.drawRailway(graphics);

    for (const building of BUILDINGS) this.drawBuilding(graphics, building);
    this.drawDecorations(graphics);
    this.add.text(70, 455, 'ORCHARD GREEN', { fontFamily: 'system-ui', fontSize: '18px', color: '#173f35', fontStyle: 'bold' }).setDepth(4);
    this.add.text(65, 945, 'RIVER ASH', { fontFamily: 'system-ui', fontSize: '16px', color: '#d8f2f5', fontStyle: 'bold' }).setDepth(4);
  }

  private drawRailway(graphics: Phaser.GameObjects.Graphics): void {
    graphics.lineStyle(9, 0x5a5147, 1).lineBetween(0, 260, 370, 260);
    graphics.lineStyle(2, 0xd9d5cb, 1).lineBetween(0, 255, 370, 255).lineBetween(0, 265, 370, 265);
    for (let x = 0; x < 370; x += 20) graphics.lineStyle(3, 0x463e37, 1).lineBetween(x, 246, x, 274);
  }

  private drawBuilding(graphics: Phaser.GameObjects.Graphics, building: (typeof BUILDINGS)[number]): void {
    graphics.fillStyle(0x000000, 0.16).fillRoundedRect(building.x + 8, building.y + 10, building.width, building.height, 10);
    graphics.fillStyle(building.wall).fillRoundedRect(building.x, building.y, building.width, building.height, 8);
    graphics.fillStyle(building.roof).fillRoundedRect(building.x - 5, building.y, building.width + 10, 30, 8);
    graphics.fillStyle(0xb9dded).fillRect(building.x + 18, building.y + 58, 28, 34).fillRect(building.x + building.width - 46, building.y + 58, 28, 34);
    graphics.fillStyle(0xf7e7c6).fillRoundedRect(building.x + building.width / 2 - 45, building.y + 38, 90, 25, 4);
    const sign = this.add.text(building.x + building.width / 2, building.y + 50, building.name.toUpperCase(), {
      fontFamily: 'system-ui', fontSize: building.width < 185 ? '9px' : '10px', color: '#173f35', fontStyle: 'bold', align: 'center', wordWrap: { width: 86 },
    }).setOrigin(0.5).setDepth(5);
    if (!building.locationId) sign.setAlpha(0.65);
    if (building.locationId) {
      const entry = INTERACTIONS.find((item) => item.locationId === building.locationId);
      if (entry) {
        graphics.fillStyle(0x493c32).fillRoundedRect(entry.point.x - 17, building.y + building.height - 30, 34, 30, 5);
        graphics.fillStyle(building.sign).fillCircle(entry.point.x, entry.point.y, 7);
      }
    }
  }

  private drawDecorations(graphics: Phaser.GameObjects.Graphics): void {
    const trees = [
      [70, 630], [320, 590], [75, 360], [305, 345], [560, 610], [910, 570], [1360, 565], [1530, 380], [1510, 860], [640, 880],
    ];
    for (const [x, y] of trees) {
      graphics.fillStyle(0x5e4936).fillRect(x - 4, y, 8, 22);
      graphics.fillStyle(0x2f7248).fillCircle(x, y - 8, 21).fillCircle(x - 13, y, 15).fillCircle(x + 13, y, 15);
    }
    graphics.fillStyle(0x6a5542).fillRect(170, 590, 72, 9).fillRect(179, 599, 7, 17).fillRect(226, 599, 7, 17);
    graphics.lineStyle(2, 0xf7e7c6, 0.8);
    for (let x = 525; x < 1080; x += 120) graphics.strokeCircle(x, 592, 5);
  }

  private createPlayerTextures(appearance: Appearance): void {
    const dirs = ['north', 'south', 'east', 'west'] as const;
    for (const direction of dirs) {
      for (let frame = 0; frame < 2; frame += 1) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const skin = Phaser.Display.Color.HexStringToColor(appearance.skinTone).color;
        const top = Phaser.Display.Color.HexStringToColor(appearance.topColour).color;
        const legs = Phaser.Display.Color.HexStringToColor(appearance.legColour).color;
        const tall = appearance.body === 'tall' ? 2 : appearance.body === 'compact' ? -2 : 0;
        const step = frame === 0 ? -2 : 2;
        graphics.fillStyle(0x000000, 0.2).fillEllipse(18, 49, 27, 8);
        graphics.fillStyle(legs).fillRoundedRect(10 + step, 31, 7, 17 + tall, 3).fillRoundedRect(20 - step, 31, 7, 17 + tall, 3);
        graphics.fillStyle(top).fillRoundedRect(7, 17, 22, 20 + tall, 7);
        graphics.fillStyle(skin).fillCircle(18, 12, 10);
        if (appearance.head === 'beanie') graphics.fillStyle(0xc55353).fillRoundedRect(8, 3, 20, 9, 5);
        else if (appearance.head === 'swept') graphics.fillStyle(0x503a2f).fillTriangle(8, 9, 29, 4, 26, 12);
        else graphics.fillStyle(0x503a2f).fillRoundedRect(9, 3, 18, 7, 4);
        if (direction === 'south') graphics.fillStyle(0x2f2b29).fillCircle(14, 12, 1.2).fillCircle(22, 12, 1.2);
        if (direction === 'east') graphics.fillStyle(0x2f2b29).fillCircle(24, 12, 1.2);
        if (direction === 'west') graphics.fillStyle(0x2f2b29).fillCircle(12, 12, 1.2);
        graphics.generateTexture(`player-${direction}-${frame}`, 36, 54);
        graphics.destroy();
      }
      this.anims.create({ key: `walk-${direction}`, frames: [{ key: `player-${direction}-0` }, { key: `player-${direction}-1` }], frameRate: 7, repeat: -1 });
    }
  }
}

export class WorldView {
  readonly scene: WorldScene;
  private readonly game: Phaser.Game;

  constructor(parent: HTMLElement, engine: GameEngine, callbacks: WorldCallbacks) {
    this.scene = new WorldScene(engine, callbacks);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#173f35',
      scene: this.scene,
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%' },
      render: { antialias: true, roundPixels: true, powerPreference: 'high-performance' },
      input: { activePointers: 3 },
    });
  }

  destroy(): void {
    this.game.destroy(true);
  }
}

export function locationPrompt(locationId: string): string {
  return `Enter ${locationById(locationId)?.name ?? 'location'}`;
}
