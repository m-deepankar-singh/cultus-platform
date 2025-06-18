"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface DebugStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  details?: any;
  error?: string;
}

export function UploadDebugger() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [steps, setSteps] = useState<DebugStep[]>([
    { name: 'Request Upload URL', status: 'pending' },
    { name: 'Validate Response', status: 'pending' },
    { name: 'Test PUT Request', status: 'pending' },
    { name: 'Verify Upload', status: 'pending' },
  ]);

  const updateStep = (index: number, updates: Partial<DebugStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  };

  const debugUpload = async () => {
    setIsDebugging(true);
    
    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', details: undefined, error: undefined })));

    try {
      // Step 1: Request Upload URL
      updateStep(0, { status: 'running' });
      
      const response = await fetch('/api/r2/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: 'debug-test.png',
          file_type: 'image/png',
          file_size: 1024,
          upload_type: 'client-logo'
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        updateStep(0, { 
          status: 'error', 
          error: `${response.status}: ${responseData.error || response.statusText}`,
          details: responseData
        });
        return;
      }

      updateStep(0, { 
        status: 'success', 
        details: {
          bucket: responseData.data.bucket,
          objectKey: responseData.data.object_key,
          hasPublicUrl: !!responseData.data.public_url,
          expiresAt: responseData.data.expires_at,
          urlDomain: new URL(responseData.data.upload_url).hostname
        }
      });

      // Step 2: Validate Response
      updateStep(1, { status: 'running' });
      
      const { upload_url, object_key, bucket } = responseData.data;
      
      if (!upload_url || !object_key || !bucket) {
        updateStep(1, { 
          status: 'error', 
          error: 'Missing required fields in response',
          details: { upload_url: !!upload_url, object_key: !!object_key, bucket: !!bucket }
        });
        return;
      }

      updateStep(1, { 
        status: 'success', 
        details: {
          urlValid: upload_url.startsWith('https://'),
          keyFormat: object_key,
          bucketName: bucket
        }
      });

      // Step 3: Test PUT Request
      updateStep(2, { status: 'running' });
      
      const testData = new Blob(['test image data'], { type: 'image/png' });
      
      try {
        const putResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/png'
          },
          body: testData
        });

        const putResponseDetails = {
          status: putResponse.status,
          statusText: putResponse.statusText,
          headers: Object.fromEntries(putResponse.headers.entries()),
          ok: putResponse.ok
        };

        if (putResponse.ok) {
          updateStep(2, { 
            status: 'success', 
            details: putResponseDetails
          });
        } else {
          const errorText = await putResponse.text();
          updateStep(2, { 
            status: 'error', 
            error: `Upload failed: ${putResponse.status} ${putResponse.statusText}`,
            details: { ...putResponseDetails, errorBody: errorText }
          });
          return;
        }
      } catch (uploadError) {
        updateStep(2, { 
          status: 'error', 
          error: `Network error: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
          details: { 
            errorType: uploadError instanceof Error ? uploadError.name : 'Unknown',
            errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError)
          }
        });
        return;
      }

      // Step 4: Verify Upload (if public URL available)
      updateStep(3, { status: 'running' });
      
      if (responseData.data.public_url) {
        try {
          const verifyResponse = await fetch(responseData.data.public_url);
          updateStep(3, { 
            status: verifyResponse.ok ? 'success' : 'error',
            error: verifyResponse.ok ? undefined : `Verification failed: ${verifyResponse.status}`,
            details: {
              status: verifyResponse.status,
              accessible: verifyResponse.ok,
              contentType: verifyResponse.headers.get('content-type')
            }
          });
        } catch (verifyError) {
          updateStep(3, { 
            status: 'error', 
            error: `Verification error: ${verifyError instanceof Error ? verifyError.message : 'Unknown'}`,
            details: { errorType: 'network' }
          });
        }
      } else {
        updateStep(3, { 
          status: 'success', 
          details: { note: 'Private bucket - no public URL to verify' }
        });
      }

    } catch (error) {
      console.error('Debug failed:', error);
      updateStep(0, { 
        status: 'error', 
        error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsDebugging(false);
    }
  };

  const getStatusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default: return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: DebugStep['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          R2 Upload Debugger
          <Button onClick={debugUpload} disabled={isDebugging}>
            {isDebugging ? 'Debugging...' : 'Run Debug Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getStatusIcon(step.status)}
                <span className={`font-medium ${getStatusColor(step.status)}`}>
                  {step.name}
                </span>
                <Badge variant="outline" className={getStatusColor(step.status)}>
                  {step.status}
                </Badge>
              </div>
            </div>
            
            {step.error && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-600">
                  {step.error}
                </AlertDescription>
              </Alert>
            )}
            
            {step.details && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(step.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This debugger tests the complete R2 upload flow to help identify where the network error occurs.
            Check the browser's Network tab for additional details about failed requests.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 