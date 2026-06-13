export interface MenuFloaterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface MenuFloaterBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Advance the menu pies through a simple contained 2D simulation:
 * move, bounce off walls, then separate / bounce off each other.
 */
export function stepFloaters(
  floaters: MenuFloaterState[],
  bounds: MenuFloaterBounds,
  deltaSeconds: number,
): MenuFloaterState[] {
  const next = floaters.map((floater) => ({
    ...floater,
    x: floater.x + floater.vx * deltaSeconds,
    y: floater.y + floater.vy * deltaSeconds,
  }));

  for (const floater of next) {
    const minX = bounds.minX + floater.radius;
    const maxX = bounds.maxX - floater.radius;
    const minY = bounds.minY + floater.radius;
    const maxY = bounds.maxY - floater.radius;

    if (floater.x < minX) {
      floater.x = minX;
      floater.vx = Math.abs(floater.vx);
    } else if (floater.x > maxX) {
      floater.x = maxX;
      floater.vx = -Math.abs(floater.vx);
    }

    if (floater.y < minY) {
      floater.y = minY;
      floater.vy = Math.abs(floater.vy);
    } else if (floater.y > maxY) {
      floater.y = maxY;
      floater.vy = -Math.abs(floater.vy);
    }
  }

  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i];
      const b = next[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.0001;
      const minDistance = a.radius + b.radius;
      if (distance >= minDistance) continue;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;

      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const aNormal = a.vx * nx + a.vy * ny;
      const bNormal = b.vx * nx + b.vy * ny;
      const exchange = aNormal - bNormal;
      a.vx -= exchange * nx;
      a.vy -= exchange * ny;
      b.vx += exchange * nx;
      b.vy += exchange * ny;
    }
  }

  return next;
}
