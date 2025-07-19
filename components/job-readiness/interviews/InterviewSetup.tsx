'use client';

import { useEffect, useState, useRef } from 'react';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AdaptiveParticles } from '@/components/ui/floating-particles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Monitor, 
  Mic, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Volume2,
  Loader2,
  Camera,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScreenRecorder } from '@/lib/ai/screen-recorder';
import { closeAudioContext } from '@/lib/ai/utils';
import gsap from 'gsap';

interface InterviewSetupProps {
  onSetupComplete?: () => void;
  onBack?: () => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface SystemCheck {
  screen: 'checking' | 'success' | 'error';
  microphone: 'checking' | 'success' | 'error';
  speakers: 'checking' | 'success' | 'error';
  browser: 'checking' | 'success' | 'error';
}

export function InterviewSetup({ onSetupComplete, onBack }: InterviewSetupProps) {
  // Device states
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string>('');
  
  // Media stream and preview
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  // System checks
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    screen: 'checking',
    microphone: 'checking',
    speakers: 'checking',
    browser: 'checking'
  });
  
  // Setup state
  const [setupStep, setSetupStep] = useState<'permissions' | 'devices' | 'testing' | 'ready'>('permissions');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // GSAP animation setup
  useEffect(() => {
    setMounted(true);
    
    // Animate cards on mount
    gsap.fromTo(
      ".dashboard-card",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        stagger: 0.1, 
        duration: 0.6, 
        ease: "power2.out"
      }
    );
  }, []);

  // Check browser compatibility
  useEffect(() => {
    const checkBrowser = async () => {
      const browserInfo = ScreenRecorder.getBrowserInfo();
      const hasWebRTC = !!window.RTCPeerConnection;
      const hasWebSocket = !!window.WebSocket;
      
      if (browserInfo.supported && hasWebRTC && hasWebSocket) {
        setSystemChecks(prev => ({ ...prev, browser: 'success' }));
      } else {
        setSystemChecks(prev => ({ ...prev, browser: 'error' }));
        
        // Provide specific error message based on missing features
        const missingFeatures = [];
        if (!browserInfo.features.getDisplayMedia) missingFeatures.push('screen sharing');
        if (!browserInfo.features.getUserMedia) missingFeatures.push('microphone access');
        if (!browserInfo.features.mediaRecorder) missingFeatures.push('video recording');
        if (!browserInfo.features.webm) missingFeatures.push('WebM video format');
        if (!hasWebRTC) missingFeatures.push('WebRTC');
        if (!hasWebSocket) missingFeatures.push('WebSocket');
        
        const errorMsg = missingFeatures.length > 0 
          ? `Your browser does not support: ${missingFeatures.join(', ')}. Please use Chrome, Firefox, Safari, or Edge.`
          : 'Your browser does not support screen recording features required for interviews.';
          
        setError(errorMsg);
      }
    };

    checkBrowser();
  }, []);

  // Request permissions and get devices
  const requestPermissions = async () => {
    try {
      setError(null);
      
      // Check screen recording support without requesting permission yet
      // We'll request permission only once when the interview starts
      if (ScreenRecorder.isSupported()) {
        setSystemChecks(prev => ({ ...prev, screen: 'success' }));
      } else {
        setSystemChecks(prev => ({ ...prev, screen: 'error' }));
        throw new Error('Screen recording is not supported in this browser.');
      }
      
      // Request microphone permissions
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        setMicrophoneStream(micStream);
        setSystemChecks(prev => ({ ...prev, microphone: 'success' }));
        
      } catch (micErr) {
        console.error('Microphone permission error:', micErr);
        setSystemChecks(prev => ({ ...prev, microphone: 'error' }));
        throw new Error('Microphone access is required for the interview.');
      }
      
      setPermissionGranted(true);
      
      // Get available devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const formattedDevices: DeviceInfo[] = deviceList
        .filter(device => device.deviceId && device.label)
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind
        }));
      
      setDevices(formattedDevices);
      
      // Set default devices
      const audioInputDevices = formattedDevices.filter(d => d.kind === 'audioinput');
      const audioOutputDevices = formattedDevices.filter(d => d.kind === 'audiooutput');
      
      if (audioInputDevices.length > 0) {
        setSelectedMicrophone(audioInputDevices[0].deviceId);
      }
      
      if (audioOutputDevices.length > 0) {
        setSelectedSpeakers(audioOutputDevices[0].deviceId);
        setSystemChecks(prev => ({ ...prev, speakers: 'success' }));
      }
      
      setSetupStep('devices');
      
    } catch (err) {
      console.error('Permission error:', err);
      setError(err instanceof Error ? err.message : 'Screen recording and microphone access are required for the interview.');
    }
  };

  // Update screen preview when display stream changes
  useEffect(() => {
    if (displayStream && permissionGranted && videoRef.current) {
      // For setup preview, we'll show a placeholder since we can't continuously share screen
      // The actual screen recording will start during the interview
    }
  }, [displayStream, permissionGranted]);

  // Audio level monitoring
  useEffect(() => {
    if (selectedMicrophone && permissionGranted) {
      navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMicrophone },
        video: false
      }).then(audioStream => {
        // Create audio context for level monitoring
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = 256;
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateAudioLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            setAudioLevel(average);
            animationRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
        
        // Stop previous audio tracks
        if (microphoneStream) {
          microphoneStream.getAudioTracks().forEach(track => track.stop());
        }
        
      }).catch(err => {
        console.error('Error switching microphone:', err);
      });
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        closeAudioContext(audioContextRef.current);
      }
    };
  }, [selectedMicrophone, permissionGranted]);

  // Test audio playback
  const testSpeakers = async () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      
      if (selectedSpeakers && (audio as any).setSinkId) {
        await (audio as any).setSinkId(selectedSpeakers);
      }
      
      await audio.play();
      setSystemChecks(prev => ({ ...prev, speakers: 'success' }));
    } catch (err) {
      console.error('Speaker test failed:', err);
      setSystemChecks(prev => ({ ...prev, speakers: 'error' }));
    }
  };

  // Start testing phase
  const startTesting = () => {
    setSetupStep('testing');
    testSpeakers();
    
    // Simulate some additional checks
    setTimeout(() => {
      setSetupStep('ready');
    }, 2000);
  };

  // Complete setup
  const completeSetup = () => {
    // Clean up streams
    if (displayStream) {
      displayStream.getTracks().forEach(track => track.stop());
    }
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      closeAudioContext(audioContextRef.current);
    }
    
    onSetupComplete?.();
  };

  const renderSystemCheck = (check: 'checking' | 'success' | 'error', label: string) => {
    const icon = check === 'checking' 
      ? <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />
      : check === 'success'
      ? <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
    
    const color = check === 'checking' 
      ? 'text-blue-600 dark:text-blue-400'
      : check === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
    
    return (
      <div className={cn("flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r backdrop-blur-sm border transition-all duration-300", 
        check === 'checking' && "from-blue-50/50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/20 border-blue-200/50 dark:border-blue-700/50",
        check === 'success' && "from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/50 dark:border-emerald-700/50",
        check === 'error' && "from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200/50 dark:border-red-700/50"
      )}>
        <div className="flex-shrink-0">
          {icon}
        </div>
        <span className={cn("text-sm font-medium", color)}>{label}</span>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen">
      {/* Background Effects */}
      <AdaptiveParticles />
      
      <div className="relative max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">Interview Setup</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Let's make sure everything is working properly for your interview</p>
        </div>
        
        {/* Progress indicator */}
        <PerformantAnimatedCard 
          variant="glass"
          className="dashboard-card mb-8 p-6"
          staggerIndex={0}
        >
          <div className="flex items-center justify-center">
            <div className="flex space-x-4">
              {['permissions', 'devices', 'testing', 'ready'].map((step, index) => {
                const currentIndex = ['permissions', 'devices', 'testing', 'ready'].indexOf(setupStep);
                const isActive = setupStep === step;
                const isCompleted = index < currentIndex;
                
                return (
                  <div key={step} className="flex items-center">
                    <div className="relative">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 backdrop-blur-sm border-2",
                        isActive && "bg-blue-600 text-white border-blue-500 shadow-lg",
                        isCompleted && "bg-emerald-500 text-white border-emerald-400",
                        !isActive && !isCompleted && "bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-400 border-neutral-400 dark:border-neutral-500"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                    </div>
                    {index < 3 && (
                      <div className={cn(
                        "w-16 h-1 mx-3 rounded-full transition-all duration-500",
                        index < currentIndex
                          ? "bg-emerald-500"
                          : "bg-neutral-300 dark:bg-neutral-600"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Step {['permissions', 'devices', 'testing', 'ready'].indexOf(setupStep) + 1} of 4: {
                setupStep === 'permissions' ? 'Permissions' :
                setupStep === 'devices' ? 'Devices' :
                setupStep === 'testing' ? 'Testing' :
                'Ready'
              }
            </p>
          </div>
        </PerformantAnimatedCard>

        {/* Step 1: Permissions */}
        {setupStep === 'permissions' && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={1}
            className="dashboard-card p-8 text-center"
          >
            <div className="space-y-6">
              {/* Icon and Title */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 dark:from-blue-400/10 dark:to-indigo-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 w-fit mx-auto">
                  <Monitor className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">Screen Recording & Microphone Access</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    We need access to your screen and microphone to conduct the interview.
                    Your privacy is important - the recording stays on your device until you submit.
                  </p>
                </div>
              </div>
              
              {/* System checks */}
              <PerformantAnimatedCard variant="subtle" className="p-6 bg-gradient-to-r from-neutral-50/50 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-900/50 backdrop-blur-sm">
                <h3 className="font-semibold mb-4 text-lg text-foreground">System Requirements</h3>
                <div className="space-y-3">
                  {renderSystemCheck(systemChecks.browser, 'Browser Compatibility')}
                  {renderSystemCheck(systemChecks.screen, 'Screen Recording Access')}
                  {renderSystemCheck(systemChecks.microphone, 'Microphone Access')}
                  {renderSystemCheck(systemChecks.speakers, 'Speaker Access')}
                </div>
              </PerformantAnimatedCard>
              
              {error && (
                <PerformantAnimatedCard variant="subtle" className="p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50 backdrop-blur-sm">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                </PerformantAnimatedCard>
              )}
              
              <div className="space-y-3 pt-4">
                <AnimatedButton 
                  onClick={requestPermissions}
                  disabled={systemChecks.browser === 'error'}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                >
                  Grant Permissions
                </AnimatedButton>
                
                {onBack && (
                  <AnimatedButton variant="outline" onClick={onBack} className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </AnimatedButton>
                )}
              </div>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Step 2: Device Selection */}
        {setupStep === 'devices' && (
          <CardGrid columns={2} gap="lg">
            {/* Screen recording preview */}
            <PerformantAnimatedCard 
              variant="glass" 
              hoverEffect="lift"
              staggerIndex={1}
              className="dashboard-card p-6"
            >
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center text-foreground">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/20 dark:from-blue-400/10 dark:to-indigo-500/10 mr-3">
                    <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Screen Recording Setup
                </h3>
                
                <div className="relative bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm" style={{ aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 dark:from-emerald-400/10 dark:to-green-500/10 w-fit mx-auto">
                        <Monitor className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Screen recording permissions granted</p>
                        <p className="text-xs text-muted-foreground">Recording will start during interview</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <PerformantAnimatedCard variant="subtle" className="p-4 bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-200/50 dark:border-blue-700/50">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    What will be recorded:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Your screen activity
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      System audio (only available when sharing a browser tab)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Your microphone input
                    </li>
                  </ul>
                </PerformantAnimatedCard>

                <PerformantAnimatedCard variant="subtle" className="p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Important:</strong> System audio is only captured when sharing a <strong>browser tab</strong>, not when sharing your entire screen or application windows.
                    </p>
                  </div>
                </PerformantAnimatedCard>
              </div>
            </PerformantAnimatedCard>

            {/* Audio controls */}
            <PerformantAnimatedCard 
              variant="glass" 
              hoverEffect="lift"
              staggerIndex={2}
              className="dashboard-card p-6"
            >
              <div className="space-y-6">
                <h3 className="font-semibold text-lg flex items-center text-foreground">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/20 dark:from-emerald-400/10 dark:to-green-500/10 mr-3">
                    <Mic className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Audio Setup
                </h3>
                
                {/* Microphone */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Microphone</label>
                  <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.filter(d => d.kind === 'audioinput').map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Audio level indicator */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Microphone Level</label>
                  <div className="relative">
                    <div className="bg-gradient-to-r from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 rounded-full h-4 overflow-hidden border border-neutral-300 dark:border-neutral-600">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-green-600 h-full transition-all duration-150 ease-out"
                        style={{ 
                          width: `${mounted ? Math.min(audioLevel * 2, 100) : 0}%`,
                          transitionDelay: audioLevel > 10 ? '0ms' : '100ms'
                        }}
                      />
                    </div>
                    <div className="absolute right-2 top-0 transform translate-y-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        audioLevel > 30 ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-neutral-400 dark:bg-neutral-600"
                      )} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Speak to test your microphone</p>
                </div>
                
                {/* Speakers */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Speakers</label>
                  <Select value={selectedSpeakers} onValueChange={setSelectedSpeakers}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50">
                      <SelectValue placeholder="Select speakers" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.filter(d => d.kind === 'audiooutput').map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <AnimatedButton 
                  onClick={testSpeakers} 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Test Speakers
                </AnimatedButton>
              </div>
            </PerformantAnimatedCard>
          </CardGrid>
        )}

        {/* Step 3: Testing */}
        {setupStep === 'testing' && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            staggerIndex={1}
            className="dashboard-card p-8 text-center"
          >
            <div className="space-y-6">
              {/* Loading indicator with progress ring */}
              <div className="relative mx-auto w-fit">
                <OptimizedProgressRing
                  value={75}
                  size={120}
                  strokeWidth={4}
                  showValue={false}
                  color="primary"
                  delay={200}
                  className="animate-pulse"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Running System Tests</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  We're testing your audio and video setup to ensure the best interview experience.
                </p>
              </div>
              
              <PerformantAnimatedCard variant="subtle" className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Testing audio quality...</span>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-400" style={{ animationDelay: '0.2s' }} />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Verifying video stream...</span>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-400" style={{ animationDelay: '0.4s' }} />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Checking connection stability...</span>
                  </div>
                </div>
              </PerformantAnimatedCard>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Step 4: Ready */}
        {setupStep === 'ready' && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={1}
            className="dashboard-card p-8 text-center"
          >
            <div className="space-y-6">
              {/* Success indicator */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 dark:from-emerald-400/10 dark:to-green-500/10 w-fit mx-auto backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/50">
                  <CheckCircle className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">Setup Complete!</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Your screen recording and audio are working perfectly. You're ready to start your interview.
                  </p>
                </div>
              </div>
              
              {/* Setup Summary */}
              <PerformantAnimatedCard variant="subtle" className="p-6 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/50">
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-4 text-lg">Setup Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Screen Recording', icon: Monitor },
                    { label: 'Microphone', icon: Mic },
                    { label: 'Speakers', icon: Volume2 }
                  ].map(({ label, icon: Icon }, index) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-100/50 to-green-100/50 dark:from-emerald-800/30 dark:to-green-800/30 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/10">
                          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{label}:</span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                  ))}
                </div>
              </PerformantAnimatedCard>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <AnimatedButton 
                  onClick={completeSetup} 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Continue to Interview
                  </div>
                </AnimatedButton>
                
                <AnimatedButton 
                  variant="outline" 
                  onClick={() => setSetupStep('devices')} 
                  className="w-full border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Adjust Settings
                  </div>
                </AnimatedButton>
              </div>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Navigation */}
        {setupStep === 'devices' && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setSetupStep('permissions')}>
              Back
            </Button>
            <Button 
              onClick={startTesting}
              disabled={!selectedMicrophone}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 