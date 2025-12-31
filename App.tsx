import React, { useState } from 'react';
import BvhViewer from './components/BvhViewer';
import ControlPanel from './components/ControlPanel';
import FileUploader from './components/FileUploader';
import { ViewerState, BvhInfo } from './types';
import { Layers, Cuboid } from 'lucide-react';

function App() {
  const [bvhContent, setBvhContent] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<Partial<BvhInfo>>({});
  
  const [viewerState, setViewerState] = useState<ViewerState>({
    isPlaying: true,
    currentTime: 0,
    duration: 0,
    timeScale: 1,
    skeletonColor: '#06b6d4', // Cyan
    backgroundColor: '#0f172a'
  });

  const handleFileLoaded = (content: string, filename: string) => {
    setBvhContent(content);
    setFileInfo({ filename });
    setViewerState(prev => ({ ...prev, currentTime: 0, isPlaying: true }));
  };

  const handleStateUpdate = (updates: Partial<ViewerState>) => {
    setViewerState(prev => {
        // Optimization: Don't update if values are extremely close (avoid jitter/render loops)
        if (updates.currentTime !== undefined && Math.abs(updates.currentTime - prev.currentTime) < 0.01 && updates.isPlaying === prev.isPlaying) {
            return prev;
        }
        return { ...prev, ...updates };
    });
  };

  // Memoized handlers to prevent unnecessary re-renders in children
  const togglePlay = () => handleStateUpdate({ isPlaying: !viewerState.isPlaying });
  const seek = (time: number) => handleStateUpdate({ currentTime: time });
  const speed = (speed: number) => handleStateUpdate({ timeScale: speed });
  const color = (c: string) => handleStateUpdate({ skeletonColor: c });

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
            <Cuboid size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              BVH Viewer
            </h1>
            <p className="text-xs text-slate-400">Motion Capture Visualization</p>
          </div>
        </div>
        
        {fileInfo.filename && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
             <Layers size={14} className="text-cyan-400" />
             <span className="text-sm text-slate-200 font-medium">{fileInfo.filename}</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {!bvhContent ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-xl w-full">
               <div className="text-center mb-10">
                 <h2 className="text-3xl font-bold text-slate-200 mb-4">Upload Motion Data</h2>
                 <p className="text-slate-400">
                   Drag and drop a .bvh file to visualize the skeletal animation in 3D space.
                 </p>
               </div>
               <FileUploader onFileLoaded={handleFileLoaded} />
               
               {/* Demo Hint */}
               <div className="mt-8 text-center">
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold">Features</p>
                  <div className="flex justify-center gap-8 mt-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Orbit Control</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Time Scaling</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Skeleton Styling</span>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <BvhViewer 
              bvhContent={bvhContent} 
              viewerState={viewerState} 
              onStateUpdate={handleStateUpdate} 
            />
            <ControlPanel 
              state={viewerState}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onSpeedChange={speed}
              onColorChange={color}
            />
            
            {/* Close / Upload New Button */}
            <button 
              onClick={() => setBvhContent(null)}
              className="absolute top-4 right-4 z-10 px-4 py-2 bg-slate-800/80 hover:bg-red-500/80 text-slate-200 hover:text-white rounded-lg backdrop-blur-sm transition-colors text-sm font-medium shadow-lg border border-slate-700 hover:border-red-400"
            >
              Close File
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;