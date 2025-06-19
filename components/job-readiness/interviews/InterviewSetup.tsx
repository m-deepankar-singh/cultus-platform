'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Camera, 
  Mic, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Volume2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  camera: 'checking' | 'success' | 'error';
  microphone: 'checking' | 'success' | 'error';
  speakers: 'checking' | 'success' | 'error';
  browser: 'checking' | 'success' | 'error';
}

export function InterviewSetup({ onSetupComplete, onBack }: InterviewSetupProps) {
  // Device states
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string>('');
  
  // Media stream and preview
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  // System checks
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    camera: 'checking',
    microphone: 'checking',
    speakers: 'checking',
    browser: 'checking'
  });
  
  // Setup state
  const [setupStep, setSetupStep] = useState<'permissions' | 'devices' | 'testing' | 'ready'>('permissions');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Check browser compatibility
  useEffect(() => {
    const checkBrowser = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebRTC = !!window.RTCPeerConnection;
      const hasWebSocket = !!window.WebSocket;
      
      if (hasGetUserMedia && hasWebRTC && hasWebSocket) {
        setSystemChecks(prev => ({ ...prev, browser: 'success' }));
      } else {
        setSystemChecks(prev => ({ ...prev, browser: 'error' }));
        setError('Your browser does not support the required features for video interviews.');
      }
    };

    checkBrowser();
  }, []);

  // Request permissions and get devices
  const requestPermissions = async () => {
    try {
      setError(null);
      
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(stream);
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
      const videoDevices = formattedDevices.filter(d => d.kind === 'videoinput');
      const audioInputDevices = formattedDevices.filter(d => d.kind === 'audioinput');
      const audioOutputDevices = formattedDevices.filter(d => d.kind === 'audiooutput');
      
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
        setSystemChecks(prev => ({ ...prev, camera: 'success' }));
      }
      
      if (audioInputDevices.length > 0) {
        setSelectedMicrophone(audioInputDevices[0].deviceId);
        setSystemChecks(prev => ({ ...prev, microphone: 'success' }));
      }
      
      if (audioOutputDevices.length > 0) {
        setSelectedSpeakers(audioOutputDevices[0].deviceId);
        setSystemChecks(prev => ({ ...prev, speakers: 'success' }));
      }
      
      setSetupStep('devices');
      
    } catch (err) {
      console.error('Permission error:', err);
      setError('Camera and microphone access is required for the interview. Please allow access and try again.');
      setSystemChecks(prev => ({
        ...prev,
        camera: 'error',
        microphone: 'error'
      }));
    }
  };

  // Update video preview when camera changes
  useEffect(() => {
    if (selectedCamera && permissionGranted && videoRef.current) {
      navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedCamera },
        audio: false
      }).then(newStream => {
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        // Stop previous video tracks
        if (stream) {
          stream.getVideoTracks().forEach(track => track.stop());
        }
      }).catch(err => {
        console.error('Error switching camera:', err);
      });
    }
  }, [selectedCamera, permissionGranted]);

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
        if (stream) {
          stream.getAudioTracks().forEach(track => track.stop());
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
        audioContextRef.current.close();
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
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    onSetupComplete?.();
  };

  const renderSystemCheck = (check: 'checking' | 'success' | 'error', label: string) => {
    const icon = check === 'checking' 
      ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      : check === 'success'
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
    
    const color = check === 'checking' 
      ? 'text-blue-600'
      : check === 'success'
      ? 'text-green-600'
      : 'text-red-600';
    
    return (
      <div className={cn("flex items-center space-x-2", color)}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Setup</h1>
          <p className="text-gray-600">Let's make sure everything is working properly for your interview</p>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex space-x-4">
            {['permissions', 'devices', 'testing', 'ready'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  setupStep === step 
                    ? "bg-blue-600 text-white"
                    : index < ['permissions', 'devices', 'testing', 'ready'].indexOf(setupStep)
                    ? "bg-green-600 text-white"
                    : "bg-gray-300 text-gray-600"
                )}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={cn(
                    "w-12 h-1 mx-2",
                    index < ['permissions', 'devices', 'testing', 'ready'].indexOf(setupStep)
                      ? "bg-green-600"
                      : "bg-gray-300"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Permissions */}
        {setupStep === 'permissions' && (
          <Card className="p-8 text-center">
            <Camera className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Camera & Microphone Access</h2>
            <p className="text-gray-600 mb-6">
              We need access to your camera and microphone to conduct the interview.
              Your privacy is important - the recording stays on your device until you submit.
            </p>
            
            {/* System checks */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3">System Requirements</h3>
              <div className="space-y-2">
                {renderSystemCheck(systemChecks.browser, 'Browser Compatibility')}
                {renderSystemCheck(systemChecks.camera, 'Camera Access')}
                {renderSystemCheck(systemChecks.microphone, 'Microphone Access')}
                {renderSystemCheck(systemChecks.speakers, 'Speaker Access')}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={requestPermissions}
                disabled={systemChecks.browser === 'error'}
                size="lg"
                className="w-full"
              >
                Grant Permissions
              </Button>
              
              {onBack && (
                <Button variant="outline" onClick={onBack} className="w-full">
                  Back
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Step 2: Device Selection */}
        {setupStep === 'devices' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Video preview */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Camera Preview
              </h3>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.filter(d => d.kind === 'videoinput').map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Audio controls */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Mic className="h-5 w-5 mr-2" />
                Audio Setup
              </h3>
              
              {/* Microphone */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Microphone</label>
                <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                  <SelectTrigger>
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
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Microphone Level</label>
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Speak to test your microphone</p>
              </div>
              
              {/* Speakers */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Speakers</label>
                <Select value={selectedSpeakers} onValueChange={setSelectedSpeakers}>
                  <SelectTrigger>
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
              
              <Button onClick={testSpeakers} variant="outline" size="sm" className="w-full">
                <Volume2 className="h-4 w-4 mr-2" />
                Test Speakers
              </Button>
            </Card>
          </div>
        )}

        {/* Step 3: Testing */}
        {setupStep === 'testing' && (
          <Card className="p-8 text-center">
            <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Running System Tests</h2>
            <p className="text-gray-600 mb-6">
              We're testing your audio and video setup to ensure the best interview experience.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">Testing audio quality...</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">Verifying video stream...</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">Checking connection stability...</span>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Ready */}
        {setupStep === 'ready' && (
          <Card className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Setup Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your audio and video are working perfectly. You're ready to start your interview.
            </p>
            
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Setup Summary</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Camera:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Ready
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Microphone:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Ready
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Speakers:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Ready
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button onClick={completeSetup} size="lg" className="w-full">
                Continue to Interview
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setSetupStep('devices')} 
                className="w-full"
              >
                Adjust Settings
              </Button>
            </div>
          </Card>
        )}

        {/* Navigation */}
        {setupStep === 'devices' && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setSetupStep('permissions')}>
              Back
            </Button>
            <Button 
              onClick={startTesting}
              disabled={!selectedCamera || !selectedMicrophone}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 