// src/components/CanvasRenderer.ts
import type { Point } from '../utils/spline';

interface GridCell {
  r: number;
  c: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private base: Point;
  private limbLengths: number[];
  private cellSize: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    base: Point,
    limbLengths: number[],
    cellSize = 40
  ) {
    this.ctx = ctx;
    this.base = base;
    this.limbLengths = limbLengths;
    this.cellSize = cellSize;
  }

  private drawSegment(start: Point, end: Point, width = 16): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.translate(start.x, start.y);
    this.ctx.rotate(angle);

    this.ctx.fillStyle = '#888';
    this.ctx.strokeStyle = '#444';
    this.ctx.fillRect(0, -width / 2, length, width);
    this.ctx.strokeRect(0, -width / 2, length, width);

    this.ctx.restore();
  }

  private drawJoint(pos: Point, r = 10, color = '#555'): void {
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#222';
    this.ctx.stroke();
  }

  private getSpeedColor(speed: number): string {
    const clamped = Math.min(1, Math.max(0, speed));
    const r = Math.round(255 * clamped);
    const g = Math.round(255 * (1 - clamped));
    return `rgb(${r},${g},0)`; // red (fast) to green (slow)
  }

  drawScene(
    checkpoints: Point[],
    angles: number[],
    locked: boolean,
    maxReach: number,
    showSpline: boolean,
    previewPoint?: Point,
    splineWithColors?: { pts: Point[]; colors: string[] }
  ): void {
    console.log('Drawing scene with', checkpoints.length, 'checkpoints, locked:', locked);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawGround();
    this.drawReachableArea(maxReach);
    this.drawPath(checkpoints, previewPoint, locked, showSpline, splineWithColors);
    this.drawRobot(angles);
  }

  private drawGround(): void {
    this.ctx.strokeStyle = '#888';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.base.y);
    this.ctx.lineTo(this.ctx.canvas.width, this.base.y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(this.base.x, this.base.y, 8, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#444';
    this.ctx.fill();
  }

  private drawReachableArea(maxReach: number): void {
    this.ctx.save();
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = 'rgba(100,100,100,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(this.base.x, this.base.y, maxReach, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  private drawPath(
    checkpoints: Point[],
    previewPoint?: Point,
    locked?: boolean,
    showSpline?: boolean,
    splineWithColors?: { pts: Point[]; colors: string[] }
  ): void {
    const shouldDrawSpline = locked && showSpline && splineWithColors;

    if (!shouldDrawSpline) {
      if (checkpoints.length === 0 && !previewPoint) return;

      this.ctx.strokeStyle = '#e74c3c';
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();

      if (checkpoints.length > 0) {
        this.ctx.moveTo(checkpoints[0].x, checkpoints[0].y);
        for (let i = 1; i < checkpoints.length; i++) {
          this.ctx.lineTo(checkpoints[i].x, checkpoints[i].y);
        }
      }

      this.ctx.stroke();

      checkpoints.forEach((pt, idx) => {
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText((idx + 1).toString(), pt.x, pt.y);
      });

      if (previewPoint && checkpoints.length > 0) {
        this.ctx.save();
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        const last = checkpoints[checkpoints.length - 1];
        this.ctx.moveTo(last.x, last.y);
        this.ctx.lineTo(previewPoint.x, previewPoint.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.arc(previewPoint.x, previewPoint.y, 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fill();
      }

      return;
    }

    // Draw colorful spline
    const { pts, colors } = splineWithColors;

    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 0; i < pts.length - 1; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(pts[i].x, pts[i].y);
      this.ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      this.ctx.strokeStyle = colors[i];
      this.ctx.stroke();
    }

    checkpoints.forEach((pt, idx) => {
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText((idx + 1).toString(), pt.x, pt.y);
    });
  }

  private drawRobot(angles: number[], roboticStyle = false): void {
    let x = this.base.x;
    let y = this.base.y;
    let thetaSum = 0;
    const joints: Point[] = [{ x, y }];

    angles.forEach((angle, i) => {
      thetaSum += angle;
      x += this.limbLengths[i] * Math.cos(thetaSum);
      y += this.limbLengths[i] * Math.sin(thetaSum);
      joints.push({ x, y });
    });

    if (!roboticStyle) {
      this.ctx.strokeStyle = '#2c3e50';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(joints[0].x, joints[0].y);
      for (let i = 1; i < joints.length; i++) {
        this.ctx.lineTo(joints[i].x, joints[i].y);
      }
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(joints.at(-1)!.x, joints.at(-1)!.y, 7, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#27ae60';
      this.ctx.fill();
    } else {
      this.ctx.lineWidth = 1;
      for (let i = 0; i < joints.length - 1; i++) {
        this.drawSegment(joints[i], joints[i + 1], 16);
        this.drawJoint(joints[i], 10);
      }
      this.drawJoint(joints.at(-1)!, 12, '#0f0');
    }
  }

  drawAssets(walls: GridCell[], blocks: GridCell[]): void {
    this.ctx.save();

    this.ctx.fillStyle = '#888';
    walls.forEach(({ r, c }) => {
      this.ctx.fillRect(
        c * this.cellSize,
        r * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    });

    this.ctx.fillStyle = '#f90';
    blocks.forEach(({ r, c }) => {
      const cx = c * this.cellSize + this.cellSize / 2;
      const cy = r * this.cellSize + this.cellSize / 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.cellSize / 3, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  drawSplineDebug(splineData: { points: Point[] }): void {
    const { points } = splineData;
    if (!points || points.length < 2) return;

    this.ctx.strokeStyle = '#3498db';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
  }
}
