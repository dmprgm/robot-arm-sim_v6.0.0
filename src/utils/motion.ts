// utils/motion.ts

import { buildSpline, sampleSplineAtArcLength } from './spline';
import { makePerlin1D } from './noise';

export interface Point {
  x: number;
  y: number;
}

export interface MotionExport {
  checkpoints: Point[];
  totalTimeSec: number;
  curvatureValues: number[];
  velocityValues: number[];
  noiseValues: number[];
}

export class MotionPlanner {
  private base: Point;
  private ikSolver: (dx: number, dy: number) => [number, number][];
  private limbLengths: number[];
  private maxReach: number;

  private checkpoints: Point[] = [];
  private curvatureValues: number[] = [];
  private velocityValues: number[] = [];
  private noiseValues: number[] = [];

  private perlinX = makePerlin1D();
  private perlinY = makePerlin1D();

  private noiseOffsets: { dx: number; dy: number }[][] = [];

  constructor(base: Point, ikSolver: (dx: number, dy: number) => [number, number][], limbLengths: number[] = []) {
    this.base = base;
    this.ikSolver = ikSolver;
    this.limbLengths = limbLengths;
    this.maxReach = limbLengths.reduce((sum, len) => sum + len, 0);
  }

  getSplineWithColors(): { pts: Point[]; colors: string[] } {
    if (this.checkpoints.length < 2) return { pts: [], colors: [] };

    const splineData = buildSpline(this.checkpoints);
    const rawPts = splineData.points;

    const speeds = this.velocityValues.length ? this.velocityValues : Array(this.checkpoints.length - 1).fill(1);
    const curvatures = this.curvatureValues.length ? this.curvatureValues : Array(this.checkpoints.length - 1).fill(0.5);
    const noises = this.noiseValues.length ? this.noiseValues : Array(this.checkpoints.length - 1).fill(0.0);

    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const speedRange = maxSpeed - minSpeed || 1;

    const getSpeedColor = (speed: number): string => {
      const t = (speed - minSpeed) / speedRange;
      const r = Math.round(255 * t);
      const g = Math.round(255 * (1 - t));
      return `rgb(${r},${g},0)`;
    };

    const segmentCount = speeds.length;
    const pointsPerSegment = Math.max(1, Math.floor(rawPts.length / segmentCount));

    const pts: Point[] = [];
    const colors: string[] = [];

    for (let i = 0; i < rawPts.length; i++) {
      const segmentIdx = Math.min(Math.floor(i / pointsPerSegment), segmentCount - 1);
      const raw = rawPts[i];
      const curvature = curvatures[segmentIdx];
      const noise = noises[segmentIdx];

      let x = raw.x;
      let y = raw.y;

      if (noise > 0) {
        const amp = 20 * noise;
        const tNoise = i * 0.1;
        x += this.perlinX(tNoise + segmentIdx * 100) * amp;
        y += this.perlinY(tNoise + segmentIdx * 200) * amp;
      }

      const linearX = this.checkpoints[segmentIdx].x + (this.checkpoints[segmentIdx + 1].x - this.checkpoints[segmentIdx].x) * (i % pointsPerSegment / pointsPerSegment);
      const linearY = this.checkpoints[segmentIdx].y + (this.checkpoints[segmentIdx + 1].y - this.checkpoints[segmentIdx].y) * (i % pointsPerSegment / pointsPerSegment);

      // const curvedX = curvature * linearX + (1 - curvature) * x;
      // const curvedY = curvature * linearY + (1 - curvature) * y;
      const curvedX = (1 - curvature) * linearX + curvature * x;
      const curvedY = (1 - curvature) * linearY + curvature * y;

      pts.push({ x: curvedX, y: curvedY });
      colors.push(getSpeedColor(speeds[segmentIdx]));
    }
    console.log(" Velocity values:", this.velocityValues);
    console.log(" Noise values:", this.noiseValues);

    return { pts, colors };
  }

  getCurvature(i: number): number {
    return this.curvatureValues[i];
  }
  setCurvature(i: number, val: number): void {
    this.curvatureValues[i] = val;
  }

  getVelocity(i: number): number {
    return this.velocityValues[i];
  }
  setVelocity(i: number, val: number): void {
    this.velocityValues[i] = val;
  }

  getNoise(i: number): number {
    return this.noiseValues[i];
  }
  setNoise(i: number, val: number): void {
    this.noiseValues[i] = val;
  }

  getCheckpoints(): Point[] {
    return this.checkpoints;
  }

  getMaxReach(): number {
    return this.maxReach;
  }

  tryAddCheckpoint(pt: Point, maxPts: number): boolean {
    const last = this.checkpoints[this.checkpoints.length - 1];
    if (last && last.x === pt.x && last.y === pt.y) return false; // Prevent duplicate
    if (this.checkpoints.length < maxPts) {
      this.checkpoints.push(pt);
      return true;
    }
    return false;
  }

  getSegmentPoints(index: number): [Point, Point] | null {
    if (index < 0 || index >= this.checkpoints.length - 1) return null;
    return [this.checkpoints[index], this.checkpoints[index + 1]];
  }


  findHoveredSegment(mx: number, my: number): number {
    const threshold = 5;
    for (let i = 0; i < this.checkpoints.length - 1; i++) {
      const A = this.checkpoints[i];
      const B = this.checkpoints[i + 1];
      const vx = B.x - A.x;
      const vy = B.y - A.y;
      const wx = mx - A.x;
      const wy = my - A.y;
      const len2 = vx * vx + vy * vy;
      if (len2 === 0) continue;
      let t = (wx * vx + wy * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = A.x + t * vx;
      const py = A.y + t * vy;
      const dist = Math.hypot(mx - px, my - py);
      if (dist <= threshold) return i;
    }
    return -1;
  }

  initializeSegments(): void {
    const n = Math.max(0, this.checkpoints.length - 1);
    this.curvatureValues = Array(n).fill(0.5);
    this.velocityValues = Array(n).fill(1.0);
    this.noiseValues = Array(n).fill(0.0);
  }

  precomputeNoiseOffsets(stepsPerSegment = 50) {
    this.noiseOffsets = [];

    for (let i = 0; i < this.checkpoints.length - 1; i++) {
      const noise = this.noiseValues[i];
      const offsets: { dx: number; dy: number }[] = [];

      for (let j = 0; j <= stepsPerSegment; j++) {
        const tNoise = j / stepsPerSegment;

        const amp = 20 * noise;
        const dx = this.perlinX(tNoise + i * 100) * amp;
        const dy = this.perlinY(tNoise + i * 200) * amp;

        offsets.push({ dx, dy });
      }

      this.noiseOffsets.push(offsets);
    }
  }


  clear(): void {
    this.checkpoints = [];
    this.curvatureValues = [];
    this.velocityValues = [];
    this.noiseValues = [];
  }

  exportData(totalTimeSec: number): MotionExport {
    return {
      checkpoints: this.checkpoints,
      totalTimeSec,
      curvatureValues: this.curvatureValues,
      velocityValues: this.velocityValues,
      noiseValues: this.noiseValues,
    };
  }

  async animate(
    totalDuration: number,
    onStep: (angles: [number, number]) => void
  ): Promise<void> {
    const checkpoints = this.checkpoints;
    const n = checkpoints.length - 1;
    if (n <= 0) return;

    const lengths: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < n; i++) {
      const dx = checkpoints[i + 1].x - checkpoints[i].x;
      const dy = checkpoints[i + 1].y - checkpoints[i].y;
      const len = Math.hypot(dx, dy);
      lengths.push(len);
      totalLen += len;
    }

    const tSegments = this.velocityValues.map((v, i) => {
      const base = totalDuration / n;
      return v > 0 ? base / v : base;
    });

    const splineData = buildSpline(checkpoints);
    let currentAngles: [number, number] = [0, 0];

    for (let i = 0; i < n; i++) {
      await new Promise<void>((resolve) => {
        const t0 = performance.now();
        const pStart = checkpoints[i];
        const pEnd = checkpoints[i + 1];
        const offsetLen = lengths.slice(0, i).reduce((a, b) => a + b, 0);
        const L_i = lengths[i];
        const duration = tSegments[i] * 1000;
        const curvature = this.getCurvature(i);
        const noise = this.getNoise(i);

        const step = (now: number) => {
          const elapsed = now - t0;
          const t = Math.min(elapsed / duration, 1);

          const linX = pStart.x + (pEnd.x - pStart.x) * t;
          const linY = pStart.y + (pEnd.y - pStart.y) * t;
          const arcLen = offsetLen + L_i * t;
          const { x: arcX, y: arcY } = sampleSplineAtArcLength(splineData, arcLen);

          let x = (1 - curvature) * linX + curvature * arcX;
          let y = (1 - curvature) * linY + curvature * arcY;

          if (noise > 0) {
            const amp = 20 * noise;
            const tNoise = now * 0.002;
            x += this.perlinX(tNoise + i * 100) * amp;
            y += this.perlinY(tNoise + i * 200) * amp;
          }

          const dx = x - this.base.x;
          const dy = y - this.base.y;
          const sols = this.ikSolver(dx, dy);
          const best = sols.reduce((b, s) => {
            const dB = Math.hypot(b[0] - currentAngles[0], b[1] - currentAngles[1]);
            const dS = Math.hypot(s[0] - currentAngles[0], s[1] - currentAngles[1]);
            return dS < dB ? s : b;
          }, sols[0]);

          currentAngles = best;
          onStep(currentAngles);

          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };

        console.log(" Velocity values2:", this.velocityValues);
        console.log(" Noise values2:", this.noiseValues);

        requestAnimationFrame(step);
      });
    }
  }
}
