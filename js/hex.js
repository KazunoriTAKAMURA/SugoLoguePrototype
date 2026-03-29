// Hex grid utilities - flat-top hexagons with axial coordinates (q, r)

export const HEX_SIZE = 26;
export const HEIGHT_PX = 10;

export function axialToPixel(q, r) {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

export function pixelToAxial(px, py) {
  const q = (2 / 3) * px / HEX_SIZE;
  const r = (-1 / 3 * px + Math.sqrt(3) / 3 * py) / HEX_SIZE;
  return hexRound(q, r);
}

export function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function getHexVertices(cx, cy, size = HEX_SIZE) {
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    vertices.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return vertices;
}

const DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function getNeighbors(q, r) {
  return DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function hexKey(q, r) {
  return `${q},${r}`;
}

// DFS: find a path of EXACTLY exactSteps length from start to target.
// Avoids blockedKeys and doesn't revisit tiles during the path.
// Returns array of {q,r} (not including start), or null.
export function findExactPath(startQ, startR, targetQ, targetR, tiles, blockedKeys, exactSteps) {
  const targetKey = hexKey(targetQ, targetR);

  // Quick check: if hex distance > exactSteps, impossible
  const dist = hexDistance(startQ, startR, targetQ, targetR);
  if (dist > exactSteps) return null;

  // DFS with path tracking
  const visited = new Set(blockedKeys);
  visited.add(hexKey(startQ, startR));

  const path = [];

  function dfs(q, r, stepsLeft) {
    if (stepsLeft === 0) {
      return hexKey(q, r) === targetKey;
    }

    // Prune: can't reach target in remaining steps
    const distToTarget = hexDistance(q, r, targetQ, targetR);
    if (distToTarget > stepsLeft) return false;

    for (const n of getNeighbors(q, r)) {
      const nKey = hexKey(n.q, n.r);
      if (visited.has(nKey)) continue;

      const tile = tiles.get(nKey);
      if (!tile || !tile.terrain.walkable) continue;

      visited.add(nKey);
      path.push({ q: n.q, r: n.r });

      if (dfs(n.q, n.r, stepsLeft - 1)) return true;

      path.pop();
      visited.delete(nKey);
    }

    return false;
  }

  if (dfs(startQ, startR, exactSteps)) {
    return [...path];
  }
  return null;
}
