import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Settings } from 'lucide-react';
import { ViewerState } from '../types';

interface ControlPanelProps {
  state: ViewerState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onColorChange: (color: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  state, 
  onTogglePlay, 
  onSeek, 
  onSpeedChange,
  onColorChange
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent z-10">
      <div className="max-w-4xl mx-auto bg-slate-800/90 backdrop-blur-md rounded-xl p-4 shadow-2xl border border-slate-700">
        
        {/* Progress Bar */}
        <div className="mb-4 flex items-center gap-4">
          <span className="text-xs font-mono text-cyan-400 w-16">{formatTime(state.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={state.duration || 100}
            step={0.01}
            value={state.currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="flex-grow h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
          />
          <span className="text-xs font-mono text-slate-400 w-16">{formatTime(state.duration)}</span>
        </div>

        {/* Controls Grid */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="p-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg transition-transform active:scale-95"
            >
              {state.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button
              onClick={() => onSeek(0)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5">
            <FastForward size={16} className="text-slate-400" />
            <select
              value={state.timeScale}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="0.1">0.1x</option>
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          {/* Style Controls */}
          <div className="flex items-center gap-2 border-l border-slate-600 pl-4">
            <Settings size={16} className="text-slate-400" />
            <div className="flex gap-1">
               {['#06b6d4', '#22c55e', '#ef4444', '#f59e0b', '#ffffff'].map((color) => (
                 <button
                   key={color}
                   onClick={() => onColorChange(color)}
                   className={`w-6 h-6 rounded-full border-2 ${state.skeletonColor === color ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                   style={{ backgroundColor: color }}
                 />
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;