// Garden skittles physics (top-down, metres and seconds).
// x: left/right across the lawn (0 = centre), z: distance down the lawn from the ball's start.

export const WORLD = {
  laneHalfWidth: 2.2,
  laneLength: 8,
  ballRadius: 0.24,
  ballMass: 5,
  pinRadius: 0.13,
  pinMass: 1.2,
  headPinZ: 5.2,
  pinSpacing: 0.52,
  ballRolling: 0.55, // ball deceleration on grass (m/s²)
  pinSliding: 2.6, // knocked pin deceleration (m/s²)
  restitution: 0.55,
  knockSpeed: 0.25, // a pin moving faster than this has fallen
  maxAngleDeg: 7,
  minSpeed: 4,
  maxSpeed: 11,
};

// Nine pins in a diamond; index 4 is the centre "king" pin (the turquoise GrandPlay pin).
export function makePins(w = WORLD) {
  const pins = [];
  const d = w.pinSpacing / Math.SQRT2;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pins.push({
        x: (i - j) * d,
        z: w.headPinZ + (i + j) * d,
        vx: 0, vz: 0,
        r: w.pinRadius, m: w.pinMass,
        fallen: false, angle: 0, king: i === 1 && j === 1,
      });
    }
  }
  return pins;
}

export function makeBall(aim, power, w = WORLD) {
  // aim in [-1, 1] maps to ±maxAngle; power in [0, 1] maps to speed.
  const a = (aim * w.maxAngleDeg * Math.PI) / 180;
  const speed = w.minSpeed + power * (w.maxSpeed - w.minSpeed);
  return { x: 0, z: 0, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, r: w.ballRadius, m: w.ballMass, spin: 0 };
}

function decel(o, amount, dt) {
  const s = Math.hypot(o.vx, o.vz);
  if (s === 0) return;
  const ns = Math.max(0, s - amount * dt);
  o.vx *= ns / s; o.vz *= ns / s;
}

function collide(a, b, e) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const dist = Math.hypot(dx, dz), min = a.r + b.r;
  if (dist === 0 || dist >= min) return false;
  const nx = dx / dist, nz = dz / dist;
  // separate
  const overlap = min - dist, tm = a.m + b.m;
  a.x -= nx * overlap * (b.m / tm); a.z -= nz * overlap * (b.m / tm);
  b.x += nx * overlap * (a.m / tm); b.z += nz * overlap * (a.m / tm);
  const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rel > 0) return true;
  const j = (-(1 + e) * rel) / (1 / a.m + 1 / b.m);
  a.vx -= (j / a.m) * nx; a.vz -= (j / a.m) * nz;
  b.vx += (j / b.m) * nx; b.vz += (j / b.m) * nz;
  return true;
}

// Advance the simulation by dt seconds. Returns true while anything is still moving.
export function step(state, dt, w = WORLD) {
  const { ball, pins } = state;
  const sub = 4, h = dt / sub;
  for (let k = 0; k < sub; k++) {
    for (const o of [ball, ...pins]) { o.x += o.vx * h; o.z += o.vz * h; }
    ball.spin += (Math.hypot(ball.vx, ball.vz) / ball.r) * h;
    for (const p of pins) {
      if (collide(ball, p, w.restitution)) p.fallen = p.fallen || Math.hypot(p.vx, p.vz) > w.knockSpeed;
    }
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        if (collide(pins[i], pins[j], w.restitution)) {
          for (const p of [pins[i], pins[j]]) if (Math.hypot(p.vx, p.vz) > w.knockSpeed) p.fallen = true;
        }
      }
    }
    decel(ball, w.ballRolling, h);
    for (const p of pins) {
      decel(p, w.pinSliding, h);
      if (p.fallen && (p.vx || p.vz)) p.angle = Math.atan2(p.vx, p.vz);
    }
  }
  const moving = [ball, ...pins].some((o) => Math.hypot(o.vx, o.vz) > 0.02);
  const ballGone = ball.z > w.laneLength + 1 || Math.abs(ball.x) > w.laneHalfWidth + 1.5;
  return moving && !(ballGone && pins.every((p) => Math.hypot(p.vx, p.vz) < 0.02));
}

export function simulate(aim, power, w = WORLD) {
  const state = { ball: makeBall(aim, power, w), pins: makePins(w) };
  for (let t = 0; t < 20 && step(state, 1 / 60, w); t += 1 / 60);
  return state.pins.filter((p) => p.fallen).length;
}
