// Canvas renderer: hexagonal hex grid with isometric height
// Only castle emoji and boss-goal emoji visible. No event dots. Player = 🦸

import { HEX_SIZE, HEIGHT_PX, axialToPixel, getHexVertices, hexKey } from './hex.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.offsetX = 0;
    this.offsetY = 0;
    this.playerAnimPhase = 0;
    this.hoveredHex = null;
  }

  resize(radius) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) > radius) continue;
        const p = axialToPixel(q, r);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
    const padding = HEX_SIZE * 3;
    const maxHeight = 5 * HEIGHT_PX;
    let w = (maxX - minX) + padding * 2;
    let h = (maxY - minY) + padding * 2 + maxHeight;

    // On mobile, scale canvas to fit viewport width
    const viewportW = window.innerWidth;
    const isMobile = viewportW <= 1024 || ('ontouchstart' in window);
    if (isMobile && w > viewportW) {
      const scale = viewportW / w;
      w = viewportW;
      h = Math.ceil(h * scale);
      this.mobileScale = scale;
    } else {
      this.mobileScale = 1;
    }

    this.canvas.width = Math.max(w, 300);
    this.canvas.height = Math.max(h, 250);
    this.offsetX = (-minX + padding) * this.mobileScale;
    this.offsetY = (-minY + padding + maxHeight) * this.mobileScale;
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  render(map, game, dt) {
    this.clear();
    this.playerAnimPhase += dt * 0.003;

    const { ctx } = this;
    if (this.mobileScale !== 1) {
      ctx.save();
      ctx.scale(this.mobileScale, this.mobileScale);
    }

    const movableSet = new Set();
    let backHexKey = null;
    if (game.state === 'moving') {
      for (const m of game.getMovableHexes()) {
        const k = hexKey(m.q, m.r);
        movableSet.add(k);
        if (m.isBack) backHexKey = k;
      }
    }

    const sortedTiles = [...map.tiles.values()].sort((a, b) => {
      const pa = axialToPixel(a.q, a.r);
      const pb = axialToPixel(b.q, b.r);
      return (pa.y - pb.y) || (pa.x - pb.x);
    });

    // Hex tiles
    for (const tile of sortedTiles) {
      const key = hexKey(tile.q, tile.r);
      this.drawHexTile(
        tile,
        movableSet.has(key),
        key === backHexKey,
        game.state === 'moving' && game.visitedThisTurn.has(key),
        this.hoveredHex && this.hoveredHex.q === tile.q && this.hoveredHex.r === tile.r,
      );
    }

    // Castle emoji only
    for (const tile of sortedTiles) {
      if (tile.terrain.id === 'castle') this.drawEmoji(tile, '🏰', 22);
    }

    // Spring emoji
    for (const tile of sortedTiles) {
      if (tile.event && tile.event.id === 'spring') this.drawEmoji(tile, '🏝️', 20);
    }

    // Warp emoji (only if visible)
    for (const tile of sortedTiles) {
      if (tile.event && tile.event.id === 'warp' && tile.warpVisible) this.drawEmoji(tile, '☸️', 20);
    }

    // Boss-goal emoji only
    for (const tile of sortedTiles) {
      if (tile.isBossGoal) this.drawBossGoal(tile);
    }

    // Player
    this.drawPlayer(game);

    if (this.mobileScale !== 1) {
      ctx.restore();
    }
  }

  drawHexTile(tile, isMovable, isBack, isVisited, isHovered) {
    const { ctx } = this;
    const pixel = axialToPixel(tile.q, tile.r);
    const sx = pixel.x + this.offsetX;
    const sy = pixel.y + this.offsetY - tile.height * HEIGHT_PX;
    const terrain = tile.terrain;
    const topVerts = getHexVertices(sx, sy);

    if (tile.height > 0) {
      const wallHeight = tile.height * HEIGHT_PX;
      for (let edge = 0; edge < 3; edge++) {
        const v1 = topVerts[edge];
        const v2 = topVerts[edge + 1];
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.lineTo(v2.x, v2.y + wallHeight);
        ctx.lineTo(v1.x, v1.y + wallHeight);
        ctx.closePath();
        ctx.fillStyle = darkenColor(terrain.side, edge === 1 ? 0.7 : 0.85);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.moveTo(topVerts[0].x, topVerts[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
    ctx.closePath();
    ctx.fillStyle = terrain.color;
    ctx.fill();

    if (isMovable && !isBack) {
      ctx.fillStyle = isHovered ? 'rgba(233, 180, 76, 0.5)' : 'rgba(233, 180, 76, 0.25)';
      ctx.fill();
    } else if (isBack) {
      ctx.fillStyle = isHovered ? 'rgba(100, 180, 255, 0.5)' : 'rgba(100, 180, 255, 0.25)';
      ctx.fill();
    } else if (isVisited) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.25)';
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawEmoji(tile, emoji, size) {
    const { ctx } = this;
    const pixel = axialToPixel(tile.q, tile.r);
    const sx = pixel.x + this.offsetX;
    const sy = pixel.y + this.offsetY - tile.height * HEIGHT_PX;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, sx, sy - 1);
  }

  drawBossGoal(tile) {
    const { ctx } = this;
    const pixel = axialToPixel(tile.q, tile.r);
    const sx = pixel.x + this.offsetX;
    const sy = pixel.y + this.offsetY - tile.height * HEIGHT_PX;

    const r = 14;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 34, 68, 0.7)';
    ctx.fill();

    const glow = Math.sin(this.playerAnimPhase * 2) * 0.3 + 0.3;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 34, 68, ${glow})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦹', sx, sy);
  }

  drawPlayer(game) {
    const { ctx } = this;
    const pos = game.position;
    const tile = game.map.tiles.get(hexKey(pos.q, pos.r));
    if (!tile) return;

    const pixel = axialToPixel(tile.q, tile.r);
    const sx = pixel.x + this.offsetX;
    const baseY = pixel.y + this.offsetY - tile.height * HEIGHT_PX;
    const bob = Math.sin(this.playerAnimPhase) * 2;
    const sy = baseY - 12 + bob;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(sx, baseY + 3, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Player emoji
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦸', sx, sy);

    // HP bar
    const barW = 22, barH = 3;
    const hpRatio = game.hp / game.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - barW / 2 - 1, sy - 20, barW + 2, barH + 2);
    ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(sx - barW / 2, sy - 19, barW * hpRatio, barH);
  }

  screenToHex(screenX, screenY, tiles) {
    // Undo mobile scaling: screen coords → canvas logical coords
    const scale = this.mobileScale || 1;
    const logX = screenX / scale;
    const logY = screenY / scale;
    // offsetX/Y were already multiplied by scale in resize, undo that
    const offX = this.offsetX / scale;
    const offY = this.offsetY / scale;
    let closest = null;
    let closestDist = Infinity;
    for (const tile of tiles.values()) {
      const pixel = axialToPixel(tile.q, tile.r);
      const sx = pixel.x + offX;
      const sy = pixel.y + offY - tile.height * HEIGHT_PX;
      const dx = logX - sx;
      const dy = logY - sy;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist && dist < HEX_SIZE * HEX_SIZE) {
        closest = tile;
        closestDist = dist;
      }
    }
    return closest;
  }
}

function darkenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}
