"use client";

import React, { useState, useRef } from 'react';
import ReactPlayer from 'react-player/file'; // Use file player for direct URLs and controlsList
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Expand, Minimize, Settings, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface CustomVideoPlayerProps {
  url: string;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
  initialSeek?: number; // in seconds
  playerRef?: React.RefObject<ReactPlayer | null>; // Allow null for the ref
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  url, 
  onEnded, 
  onPlay, 
  onPause,
  onProgress,
  initialSeek = 0,
  playerRef: externalPlayerRef
}) => {
  const internalPlayerRef = useRef<ReactPlayer>(null);
  const playerRef = externalPlayerRef || internalPlayerRef;
  
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0); // Progress percentage (0 to 1)
  const [loaded, setLoaded] = useState(0); // Loaded percentage (0 to 1)
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true); // Initially true, then fades
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaybackRateMenu, setShowPlaybackRateMenu] = useState(false);

  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handlePlayPause = () => {
    setPlaying(!playing);
    if (!playing && onPlay) onPlay();
    if (playing && onPause) onPause();
  };

  const handleVolumeChange = (newVolumeArray: number[]) => {
    const newVolume = newVolumeArray[0];
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    setMuted(!muted);
    if (!muted && volume === 0) setVolume(0.5); // Unmute to a default volume if it was 0
  };

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played);
      setLoaded(state.loaded);
    }
    if (onProgress) onProgress(state);
  };
  
  const handleDuration = (newDuration: number) => {
    setDuration(newDuration);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (newPlayedArray: number[]) => {
    const newPlayed = newPlayedArray[0];
    setPlayed(newPlayed);
    playerRef.current?.seekTo(newPlayed);
  };

  const handleSeekMouseUp = () => {
    setSeeking(false);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const handleFullScreenToggle = () => {
    if (!playerWrapperRef.current) return;
    if (!isFullscreen) {
      if (playerWrapperRef.current.requestFullscreen) {
        playerWrapperRef.current.requestFullscreen();
      } else if ((playerWrapperRef.current as any).mozRequestFullScreen) { /* Firefox */
        (playerWrapperRef.current as any).mozRequestFullScreen();
      } else if ((playerWrapperRef.current as any).webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        (playerWrapperRef.current as any).webkitRequestFullscreen();
      } else if ((playerWrapperRef.current as any).msRequestFullscreen) { /* IE/Edge */
        (playerWrapperRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) { /* Firefox */
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) { /* Chrome, Safari & Opera */
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { /* IE/Edge */
        (document as any).msExitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false); // Only hide if playing
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (playing) { // Only hide if playing
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 500);
    }
  };
  
  React.useEffect(() => {
    if (playerRef.current && initialSeek > 0) {
        playerRef.current.seekTo(initialSeek);
    }
  }, [initialSeek, playerRef]);

  React.useEffect(() => {
    // Clear timeout on unmount or when playing state changes
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing]);

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowPlaybackRateMenu(false);
  }


  
  const handleRestartVideo = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      setPlaying(true);
    }
  }

  return (
    <div 
      ref={playerWrapperRef} 
      className="relative aspect-video bg-black rounded-md overflow-hidden group/player"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        // Only toggle play/pause if click is on the video area itself, not controls
        if ((e.target as HTMLElement).closest('.custom-video-controls')) return;
        handlePlayPause();
      }}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        volume={volume}
        muted={muted}
        onProgress={handleProgress}
        onDuration={handleDuration}
        onEnded={() => {
          setPlaying(false);
          if (onEnded) onEnded();
        }}
        onPlay={() => {
          setPlaying(true);
          if(onPlay) onPlay();
        }}
        onPause={() => {
          setPlaying(false);
          if(onPause) onPause();
          setShowControls(true); // Keep controls visible when paused
        }}
        width="100%"
        height="100%"
        playbackRate={playbackRate}
        config={{
          attributes: {
            controlsList: 'nodownload',
            disablePictureInPicture: true,
          },
        }}
        // controls // We are building custom controls
      />

      {/* Overlay for play/pause button in center (visible when paused and controls are hidden) */}
       {!playing && (!showControls || playerRef.current?.getCurrentTime() === 0) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <button 
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className="p-4 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors pointer-events-auto"
            aria-label="Play video"
          >
            <Play size={48} className="fill-white" />
          </button>
        </div>
      )}
      
      {/* Custom Controls */}
      <div 
        className={cn(
          "custom-video-controls absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-300 z-20",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()} // Prevent click on controls from toggling play/pause
      >
        {/* Progress Bar */}
        <div className="flex items-center mb-2">
          <Slider
            min={0}
            max={0.999999} // Important: react-player played value is 0-1
            step={0.000001}
            value={[played]}
            onValueChange={handleSeekChange}
            onMouseDown={handleSeekMouseDown}
            onMouseUp={handleSeekMouseUp}
            className="w-full h-2 [&>span:first-child]:h-2 [&>span:first-child]:bg-transparent [&>span:first-child_[role=slider]]:bg-white [&>span:first-child_[role=slider]]:h-3 [&>span:first-child_[role=slider]]:w-3 [&>span:first-child_[role=slider]]:-top-0.5 [&>span:first-child_[role=slider]]:shadow-md"
          >
            {/* Track with loaded progress */}
            <div 
              className="absolute h-full rounded-full bg-white/30" 
              style={{ width: `${loaded * 100}%` }}
            />
            {/* Track with played progress */}
            <div 
              className="absolute h-full rounded-full bg-gradient-to-r from-neutral-100 to-neutral-300 dark:from-neutral-50 dark:to-neutral-200"
              style={{ width: `${played * 100}%` }}
            />
          </Slider>
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button onClick={handlePlayPause} className="hover:bg-white/20 p-1.5 rounded">
              {playing ? <Pause size={20} className="fill-white"/> : <Play size={20} className="fill-white"/>}
            </button>
            <button onClick={handleMuteToggle} className="hover:bg-white/20 p-1.5 rounded">
              {muted || volume === 0 ? <VolumeX size={20} className="fill-white"/> : <Volume2 size={20} className="fill-white"/>}
            </button>
            <div className="w-20">
              <Slider 
                min={0} 
                max={1} 
                step={0.05} 
                value={[muted ? 0 : volume]} 
                onValueChange={handleVolumeChange}
                className="h-1 [&>span:first-child]:h-1 [&>span:first-child_[role=slider]]:bg-white [&>span:first-child_[role=slider]]:h-2.5 [&>span:first-child_[role=slider]]:w-2.5 [&>span:first-child_[role=slider]]:-top-0.5"
              />
            </div>
            <div className="text-xs font-mono ml-1">
              {formatTime(playerRef.current ? playerRef.current.getCurrentTime() : 0)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {playerRef.current?.getCurrentTime() === duration && duration > 0 && (
              <button onClick={handleRestartVideo} className="hover:bg-white/20 p-1.5 rounded" title="Restart Video">
                <RefreshCw size={18} />
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowPlaybackRateMenu(!showPlaybackRateMenu)} className="hover:bg-white/20 p-1.5 rounded">
                <Settings size={20} />
              </button>
              {showPlaybackRateMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/80 backdrop-blur-sm rounded-md shadow-lg overflow-hidden">
                  {playbackRates.map(rate => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(
                        "w-full px-3 py-1.5 text-xs text-left hover:bg-white/20",
                        playbackRate === rate && "bg-white/30 font-semibold"
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleFullScreenToggle} className="hover:bg-white/20 p-1.5 rounded">
              {isFullscreen ? <Minimize size={20} /> : <Expand size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer; 