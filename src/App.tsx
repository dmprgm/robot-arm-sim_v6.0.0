//src/App.tsx

// import React from 'react';
import { useState, useEffect } from 'react';
import CanvasStage from './components/CanvasStage';
import DevMenu from './components/DevMenu';
import { CurrentTaskDisplay } from './components/CurrentTaskDisplay';
import { InstructionPanel } from './components/InstructionPanel';
import { ProgressBar } from './components/ProgressBar';
import CSVLoader from './components/CSVLoader';
import { useMotion } from './hooks/useMotion';
import { useUserId } from './hooks/useUserId';
import { saveAsCSV } from './utils/saveasCSV';

export default function App() {
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [numSegments, setNumSegments] = useState(3);
  const [totalDuration, setTotalDuration] = useState(5);

  //const userId = useUserId();

  const [taskList, setTaskList] = useState<string[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  const [interactionStage, setInteractionStage] = useState<'start' | 'edit' | 'ready'>('start');

  // for next button.
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [locked, setLocked] = useState(false);

  const [taskIndex, setTaskIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[][][]>([]);

  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    const newId = crypto.randomUUID(); // could change up later. idk
    localStorage.setItem('userId', newId);
    return newId;
  });

  // this is gonna be gross but:

  // App.tsx snippet inside your main function component

  const goToNextTask = (motionData: string[][]) => {
    console.log('Saving data and moving to next task');

    // Compose filename using userId and currentTaskIndex
    const filename = `user_${userId}_task_${currentTaskIndex + 1}.csv`;

    // Save CSV locally (or upload to Box here if you want)
    saveAsCSV(motionData, filename);

    // Store completed motion data (optional, for UI/history)
    setCompletedTasks(prev => [...prev, motionData]);

    // Advance task index
    if (currentTaskIndex + 1 < taskList.length) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      // All tasks done, maybe show a "finished" message or disable UI
      alert('All tasks completed!');
    }

    // Reset preview and locked states for new task
    setHasPreviewed(false);
    setLocked(false);
  };

  // rehoming locked here because WHY DIDNT I BEFORE...
  useEffect(() => {
    if (locked) {
      setInteractionStage('edit');
    } else {
      setInteractionStage('start');
    }
  }, [locked]);

  const handleNextTask = (motionData: string[][]) => {
    if (!taskList.length) return;

    const taskName = taskList[currentTaskIndex] || `task_${currentTaskIndex + 1}`;
    const filename = `${userId}_${taskName}.csv`;

    // Save CSV locally (you can add Box upload later here)
    saveAsCSV(motionData, filename);

    // Optionally store completed data in state if you want
    setCompletedTasks(prev => [...prev, motionData]);

    // Advance task or finish
    if (currentTaskIndex + 1 < taskList.length) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      setLocked(false);
      setHasPreviewed(false);
    } else {
      alert('All tasks completed! Thank you.');
      // Optionally reset or disable further input
    }
  };



  const handleToggleMenu = () => {
    console.log('Toggling Dev Menu from', devMenuOpen);
    if (hasAccess) {
      setDevMenuOpen(prev => !prev);
    } else {
      const input = prompt('Enter dev password:');
      if (input === '1') {
        setHasAccess(true);
        setDevMenuOpen(true);
      } else {
        alert('Incorrect password.');
      }
    }
  };

  // const handleToggleMenu = () => {
  //   setDevMenuOpen(true);
  // };

  // INSTRUCTION LOGIC HERE:
  useEffect(() => {
    if (locked) {
      if (hasPreviewed) {
        setInteractionStage('ready'); // 3rd
      } else {
        setInteractionStage('edit'); // 2nd
      }
    } else {
      setInteractionStage('start'); // 1st
    }
  }, [locked, hasPreviewed, setInteractionStage]);


  useEffect(() => {
    if (devMenuOpen) {
      document.body.classList.add('dev-menu-open');
    } else {
      document.body.classList.remove('dev-menu-open');
    }
  }, [devMenuOpen]);

  return (
    <>
      <div id="mainContent">
        <CanvasStage
          maxPoints={numSegments}
          locked={locked}
          setLocked={setLocked}
          hasPreviewed={hasPreviewed}
          setHasPreviewed={setHasPreviewed}
          onNextTask={goToNextTask}
        />

        <div>User ID: {userId}</div>

        {/* put dev button in mainContent */}
        {!devMenuOpen && (
          <button id="dev-open" onClick={handleToggleMenu}>
            ☰ Dev
          </button>
        )}

        <InstructionPanel
          currentStage={interactionStage}
          numSegments={numSegments}
        />
        <CurrentTaskDisplay
          task={taskList[currentTaskIndex] || null}
          index={currentTaskIndex}
          total={taskList.length}
        />
        <ProgressBar
          current={currentTaskIndex + 1}
          total={taskList.length}
        />
      </div>

      <DevMenu
        isOpen={devMenuOpen}
        toggleOpen={() => setDevMenuOpen(!devMenuOpen)}
        onClose={() => setDevMenuOpen(false)}
        onDone={() => {
          console.log('[DevMenu] Done clicked');
          setDevMenuOpen(false);
        }}
        toggleRoboticLook={(enabled) => {
          console.log('Robotic Look:', enabled);
        }}
        numSegments={numSegments}
        setNumSegments={setNumSegments}
        totalDuration={totalDuration}
        setTotalDuration={setTotalDuration}
        onTasksLoaded={(tasks) => {
          console.log('App received tasks from DevMenu:', tasks);
          setTaskList(tasks);
          setCurrentTaskIndex(0);
        }}
      />

    </>
  );
}
