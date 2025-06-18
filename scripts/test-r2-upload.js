/**
 * Test script to debug R2 upload issues
 * Run with: node scripts/test-r2-upload.js
 */

const https = require('https');
const fs = require('fs');

// Test function to check R2 upload URL
async function testR2Upload() {
  console.log('🔍 Testing R2 Upload Flow...\n');

  try {
    // Step 1: Get upload URL from our API
    console.log('Step 1: Requesting upload URL from API...');
    
    const uploadResponse = await fetch('http://localhost:3000/api/r2/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your admin JWT token here for testing
        'Authorization': 'Bearer YOUR_ADMIN_JWT_TOKEN'
      },
      body: JSON.stringify({
        file_name: 'test-image.png',
        file_type: 'image/png',
        file_size: 1024,
        upload_type: 'client-logo'
      })
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error('❌ API Error:', error);
      return;
    }

    const result = await uploadResponse.json();
    console.log('✅ Upload URL received:', {
      bucket: result.data.bucket,
      objectKey: result.data.object_key,
      expiresAt: result.data.expires_at,
      urlPrefix: result.data.upload_url.substring(0, 100) + '...'
    });

    // Step 2: Test the presigned URL with a simple PUT request
    console.log('\nStep 2: Testing presigned URL with dummy file...');
    
    const testData = Buffer.from('test image data');
    
    const putResponse = await fetch(result.data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png'
      },
      body: testData
    });

    console.log('📡 PUT Response Status:', putResponse.status);
    console.log('📡 PUT Response Headers:', Object.fromEntries(putResponse.headers.entries()));

    if (putResponse.ok) {
      console.log('✅ Upload successful!');
      
      // Test public URL access if available
      if (result.data.public_url) {
        console.log('\nStep 3: Testing public URL access...');
        const publicResponse = await fetch(result.data.public_url);
        console.log('🌐 Public URL Status:', publicResponse.status);
      }
    } else {
      const errorText = await putResponse.text();
      console.error('❌ Upload failed:', {
        status: putResponse.status,
        statusText: putResponse.statusText,
        response: errorText
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.cause) {
      console.error('📋 Error details:', error.cause);
    }
  }
}

// Run the test
testR2Upload(); 