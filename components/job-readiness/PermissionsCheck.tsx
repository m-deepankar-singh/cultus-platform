'use client';

import { useState, useEffect } from 'react';
import { Camera, Mic, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  onPermissionsGranted: () => void;
}

type PermissionState = 'checking' | 'granted' | 'denied' | 'not-requested';

export function PermissionsCheck({ onPermissionsGranted }: Props) {
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('not-requested');
  const [microphonePermission, setMicrophonePermission] = useState<PermissionState>('not-requested');
  const [isChecking, setIsChecking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Check if both permissions are granted
  const allPermissionsGranted = cameraPermission === 'granted' && microphonePermission === 'granted';

  useEffect(() => {
    if (allPermissionsGranted) {
      onPermissionsGranted();
    }
  }, [allPermissionsGranted, onPermissionsGranted]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const requestPermissions = async () => {
    setIsChecking(true);
    setCameraPermission('checking');
    setMicrophonePermission('checking');

    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Request both camera and microphone permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);
      setCameraPermission('granted');
      setMicrophonePermission('granted');

    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      // Check specific error types
      if (error.name === 'NotAllowedError') {
        setCameraPermission('denied');
        setMicrophonePermission('denied');
      } else if (error.name === 'NotFoundError') {
        // No camera/microphone found
        setCameraPermission('denied');
        setMicrophonePermission('denied');
      } else {
        // Other errors (NotSupportedError, etc.)
        setCameraPermission('denied');
        setMicrophonePermission('denied');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const getPermissionIcon = (state: PermissionState) => {
    switch (state) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPermissionText = (state: PermissionState) => {
    switch (state) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'checking':
        return 'Checking...';
      default:
        return 'Not requested';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Camera & Microphone Access
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        We need access to your camera and microphone to record your interview responses.
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="h-5 w-5 text-purple-500" />
            <span className="text-gray-900 dark:text-white">Camera Access</span>
          </div>
          <div className="flex items-center space-x-2">
            {getPermissionIcon(cameraPermission)}
            <span className={`text-sm ${
              cameraPermission === 'granted' ? 'text-green-600 dark:text-green-400' :
              cameraPermission === 'denied' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {getPermissionText(cameraPermission)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mic className="h-5 w-5 text-red-500" />
            <span className="text-gray-900 dark:text-white">Microphone Access</span>
          </div>
          <div className="flex items-center space-x-2">
            {getPermissionIcon(microphonePermission)}
            <span className={`text-sm ${
              microphonePermission === 'granted' ? 'text-green-600 dark:text-green-400' :
              microphonePermission === 'denied' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {getPermissionText(microphonePermission)}
            </span>
          </div>
        </div>
      </div>

      {!allPermissionsGranted && (
        <div className="text-center">
          <button
            onClick={requestPermissions}
            disabled={isChecking}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isChecking
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isChecking ? 'Requesting Permissions...' : 'Grant Permissions'}
          </button>
        </div>
      )}

      {cameraPermission === 'denied' || microphonePermission === 'denied' ? (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Permissions Required
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                Camera and microphone access are required to record your interview. 
                Please check your browser settings and allow access when prompted.
              </p>
              <button
                onClick={requestPermissions}
                className="text-sm font-medium text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : allPermissionsGranted ? (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Permissions Granted
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Camera and microphone access granted. You&apos;re ready to start the interview!
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
} 