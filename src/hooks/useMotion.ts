// src/hooks/useMotion.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { IKSolver } from '../utils/ik';
import { MotionPlanner } from '../utils/motion';
import { CanvasRenderer } from '../components/CanvasRenderer';
import type { Point } from '../utils/motion';
import { saveAsCSV } from '../utils/saveasCSV';

interface UseMotionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>; // compatible with useRef
  width: number;
  height: number;
  limbLengths?: [number, number];
  cellSize?: number;
  maxPoints?: number; // NEW! for num segments...
  locked: boolean;
  setLocked: React.Dispatch<React.SetStateAction<boolean>>;
  hasPreviewed: boolean;
  setHasPreviewed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMotion({
  canvasRef,
  width,
  height,
  limbLengths = [200, 100],
  cellSize = 40,
  maxPoints = 5, // <- maxPoints here is supposed to be a fallback default
  locked,
  setLocked,
  hasPreviewed,
  setHasPreviewed,
}: UseMotionOptions) {
  const plannerRef = useRef<MotionPlanner | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [angles, setAngles] = useState<[number, number]>([0, 0]);
  const [previewPoint, setPreviewPoint] = useState<Point | null | undefined>(null);


  const [motionData, setMotionData] = useState<string[][]>([]); // or appropriate type for your data
  const addMotionRecord = useCallback((newRecord: string[]) => {
    setMotionData(prev => [...prev, newRecord]);
  }, []);

  const redraw = useCallback(() => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (!planner || !renderer) return;

    const checkpoints = planner.getCheckpoints();
    const maxReach = planner.getMaxReach();
    const spline = planner.getSplineWithColors();

    renderer.drawScene(
      checkpoints,
      angles,
      locked,
      maxReach,
      true,
      undefined,
      spline
    );
  }, [angles, locked]);


  const addCheckpoint = useCallback((pt: Point) => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (!planner || !renderer) return;

    if (planner.tryAddCheckpoint(pt, maxPoints)) {
      renderer.drawScene(planner.getCheckpoints(), angles, locked, planner.getMaxReach(), false);
      if (planner.getCheckpoints().length >= maxPoints) {
        planner.initializeSegments();
        setLocked(true);
        console.log('Segment initialized. Locked = true');
      }
    }
  }, [angles, locked, maxPoints, setLocked]);

  // Initialize on mount
  useEffect(() => {
    if (plannerRef.current && rendererRef.current) {
      console.log("useMotion already initialized");
      return;
    }

    console.log("useMotion initializing");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const base: Point = { x: width / 2, y: height - 20 };
    const ik = new IKSolver(limbLengths);
    const planner = new MotionPlanner(base, ik.solve.bind(ik), limbLengths);
    const renderer = new CanvasRenderer(ctx, base, limbLengths, cellSize);

    plannerRef.current = planner;
    rendererRef.current = renderer;

    // initial draw
    renderer.drawScene(
      planner.getCheckpoints(),
      angles,
      locked,
      planner.getMaxReach(),
      false,
      previewPoint ?? undefined
    );
  }, [canvasRef, width, height, limbLengths, cellSize, angles, locked, previewPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMouseDown = false;

    const getRelativePos = (e: MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (locked) return;
      isMouseDown = true;
      setPreviewPoint(getRelativePos(e));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || locked) return;
      setPreviewPoint(getRelativePos(e));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isMouseDown || locked) return;
      isMouseDown = false;
      const pt = getRelativePos(e);
      addCheckpoint(pt);
      setPreviewPoint(null);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, addCheckpoint, locked]);

  // Redraw when angles or locked change
  useEffect(() => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (planner && renderer) {
      renderer.drawScene(
        planner.getCheckpoints(),
        angles,
        locked,
        planner.getMaxReach(),
        false,
        previewPoint ?? undefined
      );
    }
  }, [previewPoint]);

  useEffect(() => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (!planner || !renderer) return;

    renderer.drawScene(
      planner.getCheckpoints(),
      angles,
      locked,
      planner.getMaxReach(),
      false,
      previewPoint ?? undefined
    );
  }, [previewPoint]);

  const clearPath = useCallback(() => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (!planner || !renderer) return;

    planner.clear();
    setLocked(false);
    setAngles([0, 0]);
    renderer.drawScene(planner.getCheckpoints(), [0, 0], false, planner.getMaxReach(), false);
  }, [setLocked]);

  const preview = useCallback(async (totalDurationSec = 5) => {
    const planner = plannerRef.current;
    if (!planner || !locked) {
      console.warn('Preview unavailable, either planner not ready or not locked.');
      return;
    }

    if (!locked) {
      console.warn('Not locked yet');
      return;
    }

    console.log('Starting preview...');
    setHasPreviewed(true); // new! for the NEXT button.
    await planner.animate(totalDurationSec, (updated) => {
      setAngles(updated);

      const renderer = rendererRef.current;
      if (!renderer) return;

      const spline = planner.getSplineWithColors();

      renderer.drawScene(
        planner.getCheckpoints(),
        updated,
        true,  // locked = true during preview
        planner.getMaxReach(),
        true,  // <-- pass true here to tell drawScene to draw the spline (squiggly)
        undefined,
        spline
      );
    });
  }, [locked, setHasPreviewed]);

  const saveAndReset = useCallback((filename: string, totalDurationSec: number) => {
    const planner = plannerRef.current;
    const renderer = rendererRef.current;
    if (!planner || !renderer) return;

    // Export motion data
    saveAsCSV(motionData, filename);

    // Clear everything and unlock
    planner.clear();
    setLocked(false);
    setAngles([0, 0]);
    setPreviewPoint(null);
    renderer.drawScene([], [0, 0], false, planner.getMaxReach(), false);
  }, []);


  const findSegment = useCallback((pt: Point) => {
    const planner = plannerRef.current;
    if (!planner) return -1;
    return planner.findHoveredSegment(pt.x, pt.y);
  }, []);

  const exportData = useCallback((totalTimeSec: number) => {
    const planner = plannerRef.current;
    if (!planner) throw new Error('Planner not initialized');
    return planner.exportData(totalTimeSec);
  }, []);


  return {
    angles,
    locked,
    setLocked,
    addCheckpoint,
    clearPath,
    preview,
    findSegment,
    planner: plannerRef.current,
    exportData,
    motionData,
    addMotionRecord,
    hasPreviewed,
    setHasPreviewed,
  };
}
