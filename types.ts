export interface BvhInfo {
  filename: string;
  duration: number;
  frames: number;
  frameTime: number;
}

export interface ViewerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  timeScale: number;
  skeletonColor: string;
  backgroundColor: string;
}
