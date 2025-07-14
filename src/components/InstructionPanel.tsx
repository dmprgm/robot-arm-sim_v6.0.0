// InstructionPanel.tsx
import React from 'react';

interface InstructionPanelProps {
  currentStage: 'start' | 'edit' | 'ready';
  numSegments: number;
}

export const InstructionPanel: React.FC<InstructionPanelProps> = ({ currentStage, numSegments }) => {
  let message = '';
  switch (currentStage) {
    case 'start':
      message = `Click and drag to add ${numSegments} points.`;
      break;
    case 'edit':
      message = 'Click a segment to edit animation. Press play to preview motion.';
      break;
    case 'ready':
      message = 'When the motion is ready, press "next" to move on to the next task.';
      break;
  }
  return (
    <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-sm text-gray-800">
      <p>{message}</p>
    </div>
  );
};
