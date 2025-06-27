import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    // Authenticate admin access
    const authResult = await authenticateApiRequest(['Admin', 'Staff'])
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { supabase } = authResult

    // Get the submission video URL
    const { data: submission, error } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select('video_url, video_storage_path')
      .eq('id', params.submissionId)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const videoUrl = submission.video_url
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL not found' }, { status: 404 })
    }

    // Fetch the video from R2 and proxy it
    const videoResponse = await fetch(videoUrl)
    
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Video not accessible' }, { status: 404 })
    }

    // Get the video stream
    const videoBuffer = await videoResponse.arrayBuffer()

    // Return the video with proper headers
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': videoResponse.headers.get('content-type') || 'video/webm',
        'Content-Length': videoResponse.headers.get('content-length') || '',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Range',
      },
    })
  } catch (error) {
    console.error('Error proxying video:', error)
    return NextResponse.json({ error: 'Failed to load video' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range',
    },
  })
}