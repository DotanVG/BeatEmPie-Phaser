import Phaser from 'phaser';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
}

/** Reusable rounded button used by the menu / end scenes. Returns the container. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const { width = 360, height = 84, fontSize = 36, fill = 0x3a2b6b, textColor = '#fff4d6' } = opts;

  const bg = scene.add.graphics();
  const draw = (hover: boolean) => {
    bg.clear();
    bg.fillStyle(hover ? 0x5a44a0 : fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(4, 0xffe08a, hover ? 1 : 0.7);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
  };
  draw(false);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  container.on('pointerover', () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 1.05, duration: 120 });
  });
  container.on('pointerout', () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 120 });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.95, duration: 60, yoyo: true, onComplete: onClick });
  });

  return container;
}
