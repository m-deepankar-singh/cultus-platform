"use client";

import { useState } from 'react';
import { 
  ProductImageUploadExample,
  ClientLogoUploadExample, 
  LessonVideoUploadExample,
  InterviewVideoUploadExample
} from '@/components/ui/s3-upload-examples';

export default function S3UploadTestPage() {
  const [results, setResults] = useState<string[]>([]);
  
  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="h-screen overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">S3 Upload Component Tests</h1>
      
        {/* Product Image Upload */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Product Image Upload</h2>
          <ProductImageUploadExample 
            onImageUpload={(url) => addResult(`Product image uploaded: ${url}`)}
          />
        </div>

        {/* Client Logo Upload */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Client Logo Upload</h2>
          <ClientLogoUploadExample 
            onLogoUpload={(url) => {
              console.log('Client logo upload callback:', url);
              addResult(`Client logo uploaded: ${url}`);
            }}
          />
          
          {/* Debug: Direct test button */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 mb-2">Debug: Direct upload test</p>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                console.log('Debug: File selected:', file.name, file.type, file.size);
                addResult(`Debug: Starting upload of ${file.name}`);
                
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  console.log('Debug: Making request to /api/admin/clients/upload-logo');
                  const response = await fetch('/api/admin/clients/upload-logo', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  console.log('Debug: Response status:', response.status);
                  const result = await response.json();
                  console.log('Debug: Response data:', result);
                  
                  if (result.success) {
                    addResult(`Debug: SUCCESS - ${result.url}`);
                  } else {
                    addResult(`Debug: ERROR - ${result.error}`);
                  }
                } catch (error) {
                  console.error('Debug: Fetch error:', error);
                  addResult(`Debug: FETCH ERROR - ${error}`);
                }
              }}
              className="text-sm"
            />
          </div>
        </div>

        {/* Lesson Video Upload */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Lesson Video Upload</h2>
          <LessonVideoUploadExample 
            onVideoUpload={(url) => addResult(`Lesson video uploaded: ${url}`)}
          />
        </div>

        {/* Expert Session Video Upload */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Expert Session Video Upload</h2>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>DEPRECATED:</strong> Expert Session uploads now use direct upload system. 
              See app/(dashboard)/admin/job-readiness/expert-sessions/page.tsx for the updated implementation.
            </p>
          </div>
        </div>

        {/* Interview Video Upload */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Interview Video Upload</h2>
          <InterviewVideoUploadExample 
            submissionId="test-submission-456"
            onVideoUpload={(url) => addResult(`Interview video uploaded: ${url}`)}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="border rounded-lg p-6 bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">Upload Results</h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-white p-2 rounded">
                  {result}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setResults([])}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              Clear Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 