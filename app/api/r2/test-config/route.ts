import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    hasAccountId: !!process.env.R2_ACCOUNT_ID,
    hasAccessKeyId: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretAccessKey: !!process.env.R2_SECRET_ACCESS_KEY,
    accountIdLength: process.env.R2_ACCOUNT_ID?.length || 0,
    endpoint: process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'Missing account ID',
  };

  console.log('R2 Configuration Check:', config);

  return NextResponse.json({
    configured: config.hasAccountId && config.hasAccessKeyId && config.hasSecretAccessKey,
    config: {
      ...config,
      // Don't expose actual keys in response
      accountId: process.env.R2_ACCOUNT_ID ? `${process.env.R2_ACCOUNT_ID.substring(0, 8)}...` : 'Missing',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ? `${process.env.R2_ACCESS_KEY_ID.substring(0, 8)}...` : 'Missing',
    }
  });
} 