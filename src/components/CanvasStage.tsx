// src/components/CanvasStage.tsx

import React, { useRef, useState, type MouseEvent } from 'react';
import { useMotion } from '../hooks/useMotion';
import { SegmentPopup } from './SegmentPopup';
import { CanvasRenderer } from './CanvasRenderer';
import type { Point } from '../utils/motion';

interface CanvasStageProps {
  width?: number;
  height?: number;
  limbLengths?: [number, number];
  maxPoints?: number;
  defaultDuration?: number;
  locked: boolean;
  setLocked: React.Dispatch<React.SetStateAction<boolean>>;
  hasPreviewed: boolean;
  setHasPreviewed: React.Dispatch<React.SetStateAction<boolean>>;
  onNextTask: (motionData: string[][]) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  width = 800,
  height = 500,
  limbLengths = [200, 200],
  maxPoints = 4,
  defaultDuration = 5,
  locked,
  setLocked,
  hasPreviewed,
  setHasPreviewed,
  onNextTask,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [popupIndex, setPopupIndex] = useState<number>(-1);

  const {
    angles,
    //locked,
    addCheckpoint,
    clearPath,
    preview,
    findSegment,
    exportData,
    motionData,
    planner,
  } = useMotion({
    canvasRef,
    width,
    height,
    limbLengths,
    //cellSize,
    maxPoints,
    locked,
    setLocked,
    hasPreviewed,
    setHasPreviewed,
  });

  const rendererRef = useRef<CanvasRenderer | null>(null);

  // initialize renderer when canvas becomes available
  React.useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        rendererRef.current = new CanvasRenderer(ctx, { x: width / 2, y: height }, limbLengths);
      }
    }
  }, [canvasRef, width, height, limbLengths]);
  
  //  const handleNextClick = () => {
  //   if (!locked || !hasPreviewed) {
  //     alert("Please lock and preview the motion before moving to next.");
  //     return;
  //   }
  //   const totalTimeSec = 5; // Or get this from props or task config
  //   const motionData = exportData(totalTimeSec);
  //   onNextTask(motionData);
  //   clearPath();  // Reset canvas for next task
  // };

  
  const handleNextClick = () => {
    if (!canvasRef.current) return;
    console.log('Next clicked');

    // Call parent handler with current motion data to save and advance task
    onNextTask(motionData);

    // Clear current path & reset UI state
    clearPath();
  };
  
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt = { x, y };
    setMousePos(pt);

    console.log('Canvas clicked at:', x, y);

    if (!locked) {
      addCheckpoint(pt);
    } else {
      const idx = findSegment(pt);
      setPopupIndex(idx);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
      />

      {popupIndex >= 0 && planner && (() => {
        const seg = planner.getSegmentPoints(popupIndex);
        if (!seg) return null;

        const midpoint = {
          x: (seg[0].x + seg[1].x) / 2,
          y: (seg[0].y + seg[1].y) / 2,
        };

        return (
          <SegmentPopup
            x={midpoint.x}
            y={midpoint.y}
            segmentIndex={popupIndex}
            planner={planner}
            onClose={() => setPopupIndex(-1)}
            onUpdate={() => {
              const renderer = rendererRef.current;
              if (!renderer) return;
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
            }}
          />
        );
      })()}


      <div className="mt-2 flex space-x-2">
        <button
          onClick={clearPath}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear
        </button>
        <button
          onClick={() => preview(defaultDuration)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Play {/* DAMIEN! THIS ONE IS THE ONE THAT ACTUALLY CONTROLS IT ! YOUR CODE IS SLOP */}
        </button>
        {/* Show Next only after preview */}
        {hasPreviewed && (
          <button
            onClick={() => {
              // ... next task logic here
              handleNextClick();
              console.log('Next clicked');
              setHasPreviewed(false); // reset for next task
              // clear canvas, save data, etc.
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default CanvasStage;
