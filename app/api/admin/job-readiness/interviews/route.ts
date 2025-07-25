import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth'

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  status: z.string().optional(),
  student_id: z.string().optional(),
  client_id: z.string().optional(),
  ai_verdict: z.string().optional(),
  confidence_min: z.string().optional(),
  confidence_max: z.string().optional(),
  background_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = querySchema.parse(Object.fromEntries(searchParams))
    
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const offset = (page - 1) * limit

    // Build the query with left join to avoid filtering out submissions
    let query = supabase
      .from('job_readiness_ai_interview_submissions')
      .select(`
        *,
        student:students(
          id,
          full_name,
          email,
          job_readiness_tier,
          client_id,
          client:clients(
            id,
            name
          )
        )
      `)

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.student_id) {
      query = query.eq('student_id', params.student_id)
    }

    if (params.ai_verdict) {
      query = query.eq('ai_verdict', params.ai_verdict)
    }

    if (params.confidence_min) {
      query = query.gte('confidence_score', parseFloat(params.confidence_min))
    }

    if (params.confidence_max) {
      query = query.lte('confidence_score', parseFloat(params.confidence_max))
    }

    if (params.background_type) {
      query = query.eq('background_when_submitted', params.background_type)
    }

    if (params.date_from) {
      query = query.gte('created_at', params.date_from)
    }

    if (params.date_to) {
      query = query.lte('created_at', params.date_to)
    }

    // Note: client_id and search filters that reference joined tables are commented out for now
    // TODO: Fix these filters to work with the join syntax
    // if (params.client_id) {
    //   query = query.eq('student.client_id', params.client_id)
    // }
    // if (params.search) {
    //   query = query.or(`student.full_name.ilike.%${params.search}%,student.email.ilike.%${params.search}%`)
    // }

    // Build count query with same filters
    let countQuery = supabase
      .from('job_readiness_ai_interview_submissions')
      .select('*', { count: 'exact', head: true })

    // Apply same filters to count query
    if (params.status) {
      countQuery = countQuery.eq('status', params.status)
    }
    if (params.student_id) {
      countQuery = countQuery.eq('student_id', params.student_id)
    }
    if (params.ai_verdict) {
      countQuery = countQuery.eq('ai_verdict', params.ai_verdict)
    }
    if (params.confidence_min) {
      countQuery = countQuery.gte('confidence_score', parseFloat(params.confidence_min))
    }
    if (params.confidence_max) {
      countQuery = countQuery.lte('confidence_score', parseFloat(params.confidence_max))
    }
    if (params.background_type) {
      countQuery = countQuery.eq('background_when_submitted', params.background_type)
    }
    if (params.date_from) {
      countQuery = countQuery.gte('created_at', params.date_from)
    }
    if (params.date_to) {
      countQuery = countQuery.lte('created_at', params.date_to)
    }

    const { count } = await countQuery

    // Execute query with pagination and sorting
    const { data: submissions, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching interview submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }


    // Transform data for frontend compatibility
    const transformedSubmissions = submissions?.map((submission: any) => ({
      id: submission.id,
      student_id: submission.student_id,
      student_name: submission.student?.full_name || 'Unknown Student',
      student_email: submission.student?.email || 'No email',
      student_tier: submission.student?.job_readiness_tier || submission.tier_when_submitted,
      client_id: submission.student?.client_id,
      client_name: submission.student?.client?.name || 'No Client',
      status: submission.status,
      score: submission.score,
      passed: submission.passed,
      feedback: submission.feedback,
      ai_feedback: submission.ai_feedback,
      ai_verdict: submission.ai_verdict,
      admin_verdict_override: submission.admin_verdict_override,
      final_verdict: submission.final_verdict,
      confidence_score: submission.confidence_score,
      background_when_submitted: submission.background_when_submitted,
      tier_when_submitted: submission.tier_when_submitted,
      video_storage_path: submission.video_storage_path,
      video_url: submission.video_url,
      questions_used: submission.questions_used,
      analysis_result: submission.analysis_result,
      gemini_file_uri: submission.gemini_file_uri,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      analyzed_at: submission.analyzed_at,
      // Additional fields for admin interface
      type: 'interview', // Distinguish from project submissions
      has_video: !!submission.video_storage_path,
      question_count: submission.questions_used ? submission.questions_used.length : 0,
      requires_manual_review: false, // interviews don't require manual review like projects do
    })) || []

    return NextResponse.json({
      submissions: transformedSubmissions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in interview submissions API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 