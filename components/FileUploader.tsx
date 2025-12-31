import React, { useRef } from 'react';
import { Upload, FileType } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (content: string, filename: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.bvh')) {
      alert('Please upload a valid .bvh file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoaded(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-lg hover:border-cyan-400 transition-colors bg-slate-800/50 cursor-pointer group"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".bvh" 
        className="hidden" 
      />
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <Upload className="w-12 h-12 mb-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
        <p className="mb-2 text-lg text-slate-300 font-semibold">Click to upload or drag and drop</p>
        <p className="text-sm text-slate-500">BVH Motion Capture files only</p>
      </div>
    </div>
  );
};

export default FileUploader;