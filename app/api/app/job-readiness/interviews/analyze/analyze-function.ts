import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI, createUserContent, createPartFromUri, Type } from '@google/genai';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Define the structured output schema for interview analysis
const interviewAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    communication_skills: {
      type: Type.OBJECT,
      properties: {
        clarity_score: { type: Type.NUMBER, description: "Score from 1-10 for clarity and articulation" },
        pace_score: { type: Type.NUMBER, description: "Score from 1-10 for speaking pace" },
        professional_language_score: { type: Type.NUMBER, description: "Score from 1-10 for professional language use" },
        overall_score: { type: Type.NUMBER, description: "Overall communication score from 1-10" },
        feedback: { type: Type.STRING, description: "Detailed feedback on communication skills" },
        specific_examples: { type: Type.STRING, description: "Specific examples observed in the video" }
      },
      required: ["clarity_score", "pace_score", "professional_language_score", "overall_score", "feedback", "specific_examples"]
    },
    technical_knowledge: {
      type: Type.OBJECT,
      properties: {
        domain_understanding_score: { type: Type.NUMBER, description: "Score from 1-10 for domain knowledge" },
        depth_of_knowledge_score: { type: Type.NUMBER, description: "Score from 1-10 for knowledge depth" },
        accuracy_score: { type: Type.NUMBER, description: "Score from 1-10 for technical accuracy" },
        overall_score: { type: Type.NUMBER, description: "Overall technical knowledge score from 1-10" },
        feedback: { type: Type.STRING, description: "Detailed feedback on technical knowledge" },
        specific_examples: { type: Type.STRING, description: "Specific technical examples observed" }
      },
      required: ["domain_understanding_score", "depth_of_knowledge_score", "accuracy_score", "overall_score", "feedback", "specific_examples"]
    },
    problem_solving: {
      type: Type.OBJECT,
      properties: {
        structured_thinking_score: { type: Type.NUMBER, description: "Score from 1-10 for structured thinking" },
        logical_approach_score: { type: Type.NUMBER, description: "Score from 1-10 for logical approach" },
        creativity_score: { type: Type.NUMBER, description: "Score from 1-10 for creative problem solving" },
        overall_score: { type: Type.NUMBER, description: "Overall problem-solving score from 1-10" },
        feedback: { type: Type.STRING, description: "Detailed feedback on problem-solving approach" },
        specific_examples: { type: Type.STRING, description: "Specific problem-solving examples observed" }
      },
      required: ["structured_thinking_score", "logical_approach_score", "creativity_score", "overall_score", "feedback", "specific_examples"]
    },
    confidence_and_presence: {
      type: Type.OBJECT,
      properties: {
        body_language_score: { type: Type.NUMBER, description: "Score from 1-10 for body language" },
        eye_contact_score: { type: Type.NUMBER, description: "Score from 1-10 for eye contact" },
        overall_confidence_score: { type: Type.NUMBER, description: "Score from 1-10 for overall confidence" },
        overall_score: { type: Type.NUMBER, description: "Overall confidence and presence score from 1-10" },
        feedback: { type: Type.STRING, description: "Detailed feedback on confidence and presence" },
        specific_examples: { type: Type.STRING, description: "Specific examples of confidence/presence observed" }
      },
      required: ["body_language_score", "eye_contact_score", "overall_confidence_score", "overall_score", "feedback", "specific_examples"]
    },
    interview_engagement: {
      type: Type.OBJECT,
      properties: {
        responsiveness_score: { type: Type.NUMBER, description: "Score from 1-10 for responsiveness to questions" },
        engagement_level_score: { type: Type.NUMBER, description: "Score from 1-10 for overall engagement" },
        listening_skills_score: { type: Type.NUMBER, description: "Score from 1-10 for listening skills" },
        overall_score: { type: Type.NUMBER, description: "Overall interview engagement score from 1-10" },
        feedback: { type: Type.STRING, description: "Detailed feedback on interview engagement" },
        specific_examples: { type: Type.STRING, description: "Specific examples of engagement observed" }
      },
      required: ["responsiveness_score", "engagement_level_score", "listening_skills_score", "overall_score", "feedback", "specific_examples"]
    },
    areas_for_improvement: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING, description: "Area needing improvement" },
          priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"], description: "Priority level" },
          specific_feedback: { type: Type.STRING, description: "Specific actionable feedback" },
          examples: { type: Type.STRING, description: "Examples from the video" }
        },
        required: ["area", "priority", "specific_feedback", "examples"]
      }
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          strength: { type: Type.STRING, description: "Identified strength" },
          evidence: { type: Type.STRING, description: "Evidence from the video" },
          impact: { type: Type.STRING, description: "How this strength positively impacts the interview" }
        },
        required: ["strength", "evidence", "impact"]
      }
    },
    overall_assessment: {
      type: Type.OBJECT,
      properties: {
        total_score: { type: Type.NUMBER, description: "Overall interview score from 1-100" },
        tier_appropriate: { type: Type.BOOLEAN, description: "Whether performance matches the tier level" },
        background_alignment: { type: Type.BOOLEAN, description: "Whether answers align with stated background" },
        summary: { type: Type.STRING, description: "Overall performance summary" },
        key_concerns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Main concerns about the candidate" },
        key_positives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Main positive points about the candidate" }
      },
      required: ["total_score", "tier_appropriate", "background_alignment", "summary", "key_concerns", "key_positives"]
    },
    final_verdict: {
      type: Type.OBJECT,
      properties: {
        decision: { type: Type.STRING, enum: ["APPROVED", "REJECTED"], description: "Final hiring decision" },
        confidence_level: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"], description: "Confidence in the decision" },
        reasoning: { type: Type.STRING, description: "Detailed reasoning for the decision" },
        minimum_score_met: { type: Type.BOOLEAN, description: "Whether minimum score threshold was met" },
        tier_requirements_met: { type: Type.BOOLEAN, description: "Whether tier-specific requirements were met" },
        recommendation: { type: Type.STRING, description: "Specific recommendation for next steps" }
      },
      required: ["decision", "confidence_level", "reasoning", "minimum_score_met", "tier_requirements_met", "recommendation"]
    }
  },
  required: [
    "communication_skills", 
    "technical_knowledge", 
    "problem_solving", 
    "confidence_and_presence", 
    "interview_engagement",
    "areas_for_improvement", 
    "strengths", 
    "overall_assessment", 
    "final_verdict"
  ],
  propertyOrdering: [
    "communication_skills", 
    "technical_knowledge", 
    "problem_solving", 
    "confidence_and_presence", 
    "interview_engagement",
    "areas_for_improvement", 
    "strengths", 
    "overall_assessment", 
    "final_verdict"
  ]
};

// Helper function to ensure all required sections are present with reasonable defaults
function ensureCompleteAnalysis(partialResult: any, submission: any) {
  const defaultAnalysis = {
    communication_skills: {
      clarity_score: 1,
      pace_score: 1,
      professional_language_score: 1,
      overall_score: 1,
      feedback: "Unable to assess communication skills - analysis incomplete",
      specific_examples: "No specific examples could be analyzed"
    },
    technical_knowledge: {
      domain_understanding_score: 1,
      depth_of_knowledge_score: 1,
      accuracy_score: 1,
      overall_score: 1,
      feedback: "Unable to assess technical knowledge - analysis incomplete",
      specific_examples: "No technical examples could be analyzed"
    },
    problem_solving: {
      structured_thinking_score: 1,
      logical_approach_score: 1,
      creativity_score: 1,
      overall_score: 1,
      feedback: "Unable to assess problem-solving skills - analysis incomplete",
      specific_examples: "No problem-solving examples could be analyzed"
    },
    confidence_and_presence: {
      body_language_score: 1,
      eye_contact_score: 1,
      overall_confidence_score: 1,
      overall_score: 1,
      feedback: "Unable to assess confidence and presence - analysis incomplete",
      specific_examples: "No confidence indicators could be analyzed"
    },
    interview_engagement: {
      responsiveness_score: 1,
      engagement_level_score: 1,
      listening_skills_score: 1,
      overall_score: 1,
      feedback: "Unable to assess interview engagement - analysis incomplete",
      specific_examples: "No engagement indicators could be analyzed"
    },
    areas_for_improvement: [
      {
        area: "Complete Analysis Required",
        priority: "HIGH",
        specific_feedback: "The analysis was incomplete and needs to be regenerated",
        examples: "Please retry the analysis for complete feedback"
      }
    ],
    strengths: [
      {
        strength: "Analysis Incomplete",
        evidence: "Unable to identify strengths due to incomplete analysis",
        impact: "Please retry analysis for complete evaluation"
      }
    ],
    overall_assessment: {
      total_score: 10,
      tier_appropriate: false,
      background_alignment: false,
      summary: "Analysis was incomplete and could not provide comprehensive evaluation",
      key_concerns: ["Incomplete analysis", "Unable to assess performance"],
      key_positives: ["Analysis needs to be completed"]
    },
    final_verdict: {
      decision: "REJECTED",
      confidence_level: "LOW",
      reasoning: "Analysis was incomplete and could not provide reliable assessment",
      minimum_score_met: false,
      tier_requirements_met: false,
      recommendation: "Retry analysis to get complete evaluation"
    }
  };

  // Merge partial result with defaults, keeping any existing complete sections
  const completeResult = { ...defaultAnalysis };
  
  for (const [key, value] of Object.entries(partialResult)) {
    if (value && typeof value === 'object') {
      (completeResult as any)[key] = value;
    }
  }

  return completeResult;
}

// Helper function to validate and fix the analysis structure
function validateAndFixAnalysisStructure(analysisResult: any, submission: any) {
  // Ensure all scores are numbers between 1-10
  const scoreFields = [
    'communication_skills.clarity_score',
    'communication_skills.pace_score', 
    'communication_skills.professional_language_score',
    'communication_skills.overall_score',
    'technical_knowledge.domain_understanding_score',
    'technical_knowledge.depth_of_knowledge_score',
    'technical_knowledge.accuracy_score',
    'technical_knowledge.overall_score',
    'problem_solving.structured_thinking_score',
    'problem_solving.logical_approach_score',
    'problem_solving.creativity_score',
    'problem_solving.overall_score',
    'confidence_and_presence.body_language_score',
    'confidence_and_presence.eye_contact_score',
    'confidence_and_presence.overall_confidence_score',
    'confidence_and_presence.overall_score',
    'interview_engagement.responsiveness_score',
    'interview_engagement.engagement_level_score',
    'interview_engagement.listening_skills_score',
    'interview_engagement.overall_score'
  ];

  scoreFields.forEach(fieldPath => {
    const parts = fieldPath.split('.');
    let obj = analysisResult;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    
    const finalField = parts[parts.length - 1];
    if (typeof obj[finalField] !== 'number' || obj[finalField] < 1 || obj[finalField] > 10) {
      obj[finalField] = 1; // Default to minimum score
    }
  });

  // Ensure total_score is calculated properly (1-100)
  if (!analysisResult.overall_assessment) {
    analysisResult.overall_assessment = {};
  }

  const totalScore = Math.round(
    (analysisResult.communication_skills.overall_score +
     analysisResult.technical_knowledge.overall_score +
     analysisResult.problem_solving.overall_score +
     analysisResult.confidence_and_presence.overall_score +
     analysisResult.interview_engagement.overall_score) * 2
  );

  analysisResult.overall_assessment.total_score = Math.max(1, Math.min(100, totalScore));

  // Ensure arrays exist and have at least one item
  if (!Array.isArray(analysisResult.areas_for_improvement) || analysisResult.areas_for_improvement.length === 0) {
    analysisResult.areas_for_improvement = [
      {
        area: "General Improvement Needed",
        priority: "MEDIUM",
        specific_feedback: "Focus on overall interview performance",
        examples: "Practice mock interviews and technical discussions"
      }
    ];
  }

  if (!Array.isArray(analysisResult.strengths) || analysisResult.strengths.length === 0) {
    analysisResult.strengths = [
      {
        strength: "Participation",
        evidence: "Candidate participated in the interview process",
        impact: "Shows willingness to engage in the evaluation process"
      }
    ];
  }

  // Ensure string fields exist
  const requiredStringFields = [
    'communication_skills.feedback',
    'communication_skills.specific_examples',
    'technical_knowledge.feedback',
    'technical_knowledge.specific_examples',
    'problem_solving.feedback',
    'problem_solving.specific_examples',
    'confidence_and_presence.feedback',
    'confidence_and_presence.specific_examples',
    'interview_engagement.feedback',
    'interview_engagement.specific_examples',
    'overall_assessment.summary',
    'final_verdict.reasoning',
    'final_verdict.recommendation'
  ];

  requiredStringFields.forEach(fieldPath => {
    const parts = fieldPath.split('.');
    let obj = analysisResult;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    
    const finalField = parts[parts.length - 1];
    if (typeof obj[finalField] !== 'string' || !obj[finalField]) {
      obj[finalField] = `Assessment for ${fieldPath} was not completed`;
    }
  });

  // Ensure arrays exist for key_concerns and key_positives
  if (!Array.isArray(analysisResult.overall_assessment.key_concerns)) {
    analysisResult.overall_assessment.key_concerns = ["Analysis was incomplete"];
  }
  
  if (!Array.isArray(analysisResult.overall_assessment.key_positives)) {
    analysisResult.overall_assessment.key_positives = ["Candidate participated in interview"];
  }

  // Ensure final verdict has proper enum values
  if (!analysisResult.final_verdict.decision || !['APPROVED', 'REJECTED'].includes(analysisResult.final_verdict.decision)) {
    analysisResult.final_verdict.decision = 'REJECTED';
  }

  if (!analysisResult.final_verdict.confidence_level || !['HIGH', 'MEDIUM', 'LOW'].includes(analysisResult.final_verdict.confidence_level)) {
    analysisResult.final_verdict.confidence_level = 'LOW';
  }

  // Set appropriate booleans
  const minScoreThresholds = {
    'BRONZE': 60,
    'SILVER': 70,
    'GOLD': 80
  };

  const tier = submission.tier_when_submitted || 'BRONZE';
  const minScore = minScoreThresholds[tier as keyof typeof minScoreThresholds] || 60;
  
  analysisResult.final_verdict.minimum_score_met = analysisResult.overall_assessment.total_score >= minScore;
  analysisResult.final_verdict.tier_requirements_met = analysisResult.final_verdict.minimum_score_met;
  
  analysisResult.overall_assessment.tier_appropriate = analysisResult.final_verdict.tier_requirements_met;
  analysisResult.overall_assessment.background_alignment = analysisResult.overall_assessment.total_score >= 50; // Basic threshold

  return analysisResult;
}

export async function analyzeInterview(submissionId: string, userId: string) {
  try {
    console.log(`🔍 Starting analysis for submission ${submissionId} by user ${userId}`);
    
    // Create Supabase client
    const supabase = await createClient();
    console.log('✅ Supabase client created successfully');

    // Get submission from database
    console.log(`🔍 Fetching submission ${submissionId} for user ${userId}`);
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('student_id', userId)
      .single();

    if (submissionError || !submission) {
      console.error('❌ Submission not found:', submissionError);
      throw new Error('Submission not found');
    }

    console.log(`✅ Submission found:`, {
      id: submission.id,
      status: submission.status,
      video_path: submission.video_storage_path,
      background: submission.background_when_submitted,
      tier: submission.tier_when_submitted
    });

    if (submission.status === 'analyzed') {
      console.log('⚠️ Submission already analyzed, skipping');
      return {
        success: true,
        message: 'Already analyzed',
        feedback: submission.ai_feedback
      };
    }

    // Update status to analyzing
    console.log('🔄 Updating status to analyzing...');
    const { error: statusUpdateError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .update({ 
        status: 'analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (statusUpdateError) {
      console.error('❌ Failed to update status to analyzing:', statusUpdateError);
      throw new Error('Failed to update status');
    }
    console.log('✅ Status updated to analyzing');

    // Download video from Supabase storage
    console.log(`📥 Downloading video from storage: ${submission.video_storage_path}`);
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('interview_recordings')
      .download(submission.video_storage_path);

    if (downloadError || !videoData) {
      console.error('❌ Failed to download video:', downloadError);
      console.log('🔄 Updating status to error...');
      const { error: errorUpdateError } = await supabase
        .from('job_readiness_ai_interview_submissions')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
      
      if (errorUpdateError) {
        console.error('❌ Failed to update error status:', errorUpdateError);
      } else {
        console.log('✅ Status updated to error');
      }
      
      throw new Error('Failed to download video for analysis');
    }

    console.log(`✅ Video downloaded successfully, size: ${videoData.size} bytes`);

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }
    console.log('✅ Gemini API key found');
    
    const ai = new GoogleGenAI({ apiKey });

    // Convert blob to buffer and write to temporary file
    console.log('📝 Converting video to buffer and writing to temp file...');
    const videoBuffer = Buffer.from(await videoData.arrayBuffer());
    const tempFileName = `temp_interview_${submissionId}.webm`;
    const tempFilePath = join(tmpdir(), tempFileName);
    
    // Write buffer to temporary file
    writeFileSync(tempFilePath, videoBuffer);
    console.log(`✅ Temp file created: ${tempFilePath}, size: ${videoBuffer.length} bytes`);

    let tempFileCreated = true;

    try {
      // Upload video to Gemini Files API
      console.log('📤 Uploading video to Gemini Files API...');
      
      const myfile = await ai.files.upload({
        file: tempFilePath,
        config: { 
          mimeType: "video/webm",
          displayName: tempFileName
        },
      });

      console.log('✅ Video uploaded to Gemini Files API:', myfile.uri);

      // Wait for processing if needed
      if (!myfile.name) {
        console.error('❌ File upload failed - no file name returned');
        throw new Error('File upload failed - no file name returned');
      }
      
      console.log('⏳ Checking file processing status...');
      let fileStatus = await ai.files.get({ name: myfile.name });
      while (fileStatus.state === 'PROCESSING') {
        console.log('⏳ Video is processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileStatus = await ai.files.get({ name: myfile.name });
      }

      if (fileStatus.state === 'FAILED') {
        console.error('❌ Video processing failed in Gemini');
        throw new Error('Video processing failed in Gemini');
      }

      console.log('✅ Video processed successfully, generating analysis...');

      // Create comprehensive analysis prompt
      const analysisPrompt = `
You are an expert interview assessor conducting a comprehensive evaluation of a job interview video. 

**CRITICAL: You MUST provide a complete analysis with ALL required sections filled out. Do not leave any section incomplete.**

**Interview Context:**
- Questions Asked: ${JSON.stringify(submission.questions_used)}
- Candidate Background: ${submission.background_when_submitted}
- Difficulty Tier: ${submission.tier_when_submitted}

**Evaluation Criteria:**

**SCORING GUIDELINES:**
- 1-3: Poor/Unacceptable
- 4-6: Below Average/Needs Improvement  
- 7-8: Good/Acceptable
- 9-10: Excellent/Outstanding

**TIER-SPECIFIC EXPECTATIONS:**
- BRONZE: Basic competency, clear communication, fundamental knowledge
- SILVER: Intermediate skills, structured thinking, good technical understanding
- GOLD: Advanced expertise, exceptional communication, deep technical knowledge, leadership potential

**MINIMUM PASSING THRESHOLDS:**
- BRONZE: 60/100 overall score
- SILVER: 70/100 overall score  
- GOLD: 80/100 overall score

**MANDATORY ANALYSIS SECTIONS - ALL REQUIRED:**

1. **COMMUNICATION SKILLS** (required scores: clarity, pace, professional_language, overall + feedback + examples)
2. **TECHNICAL KNOWLEDGE** (required scores: domain_understanding, depth, accuracy, overall + feedback + examples)
3. **PROBLEM SOLVING** (required scores: structured_thinking, logical_approach, creativity, overall + feedback + examples)
4. **CONFIDENCE & PRESENCE** (required scores: body_language, eye_contact, confidence, overall + feedback + examples)
5. **INTERVIEW ENGAGEMENT** (required scores: responsiveness, engagement_level, listening, overall + feedback + examples)
6. **AREAS FOR IMPROVEMENT** (required: at least 3-5 specific areas with priority levels and examples)
7. **STRENGTHS** (required: at least 1-3 identified strengths with evidence and impact)
8. **OVERALL ASSESSMENT** (required: total_score, tier_appropriate, background_alignment, summary, key_concerns, key_positives)
9. **FINAL VERDICT** (required: decision, confidence_level, reasoning, minimum_score_met, tier_requirements_met, recommendation)

**ANALYSIS REQUIREMENTS:**

1. **Watch the entire video carefully** and observe:
   - Verbal responses to each question
   - Non-verbal communication (body language, eye contact, gestures)
   - Technical explanations and problem-solving approaches
   - Overall engagement and professionalism

2. **Evaluate EVERY category** with specific examples from the video

3. **Consider tier appropriateness** - does the candidate demonstrate skills expected for their tier level?

4. **Make a clear APPROVED/REJECTED decision** based on:
   - Meeting minimum score threshold for their tier
   - Demonstrating competencies appropriate for their background
   - Overall interview performance quality

5. **Provide actionable feedback** that the candidate can use to improve

**IMPORTANT REMINDERS:**
- ALL scores must be numbers between 1-10
- ALL feedback sections must contain meaningful text
- ALL required arrays (areas_for_improvement, strengths, key_concerns, key_positives) must have at least one item
- The response must be complete JSON with all required fields
- Be thorough, fair, and constructive in your assessment
- Use specific examples from the video to support your scores and decision
- If the candidate performs poorly, still provide constructive feedback for improvement

**DO NOT SKIP ANY SECTIONS - ALL MUST BE COMPLETED**
`;

      if (!myfile.uri) {
        console.error('❌ File upload failed - no file URI returned');
        throw new Error('File upload failed - no file URI returned');
      }

      console.log('🤖 Calling Gemini AI for analysis...');
      // Generate analysis using structured output
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-05-20",
        contents: createUserContent([
          createPartFromUri(myfile.uri, myfile.mimeType || "video/webm"),
          analysisPrompt
        ]),
        config: {
          responseMimeType: "application/json",
          responseSchema: interviewAnalysisSchema
        }
      });

      console.log('✅ Gemini AI analysis completed');
      console.log('📊 Raw response length:', response.text?.length || 0);

      let analysisResult = JSON.parse(response.text || '{}');
      console.log('✅ Analysis result parsed successfully');
      
      // Validate that all required sections are present and complete
      const requiredSections = [
        'communication_skills',
        'technical_knowledge', 
        'problem_solving',
        'confidence_and_presence',
        'interview_engagement',
        'areas_for_improvement',
        'strengths',
        'overall_assessment',
        'final_verdict'
      ];

      const missingSections = requiredSections.filter(section => !analysisResult[section]);
      
      if (missingSections.length > 0) {
        console.warn('⚠️ Missing sections in analysis result:', missingSections);
        
        // Generate a complete analysis with default values for missing sections
        analysisResult = ensureCompleteAnalysis(analysisResult, submission);
        console.log('✅ Missing sections filled with defaults');
      }

      // Additional validation for nested required fields
      console.log('🔍 Validating and fixing analysis structure...');
      analysisResult = validateAndFixAnalysisStructure(analysisResult, submission);
      console.log('✅ Analysis structure validated and fixed');

      const feedback = JSON.stringify(analysisResult, null, 2);
      console.log('📄 Feedback JSON created, length:', feedback.length);

      // Extract verdict information
      const finalVerdict = analysisResult.final_verdict?.decision || 'REJECTED';
      const overallScore = analysisResult.overall_assessment?.total_score || 0;
      const confidenceScore = analysisResult.final_verdict?.confidence_level === 'HIGH' ? 0.9 : 
                               analysisResult.final_verdict?.confidence_level === 'MEDIUM' ? 0.7 : 0.5;

      console.log('📊 Analysis summary:', {
        finalVerdict,
        overallScore,
        confidenceScore
      });

      // Clean up the uploaded file from Gemini
      try {
        console.log('🧹 Cleaning up Gemini file...');
        await ai.files.delete({ name: myfile.name });
        console.log('✅ Cleaned up Gemini file:', myfile.name);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup Gemini file:', cleanupError);
      }

      // Update submission with analysis results
      console.log('💾 Updating submission with analysis results...');
      const updateData = {
          status: 'analyzed',
          ai_feedback: feedback,
          gemini_file_uri: myfile.uri,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          score: overallScore,
          passed: finalVerdict === 'APPROVED',
          ai_verdict: finalVerdict.toLowerCase(),
          final_verdict: finalVerdict.toLowerCase(),
          confidence_score: confidenceScore,
          analysis_result: analysisResult
      };

      console.log('📝 Update data prepared:', {
        status: updateData.status,
        score: updateData.score,
        passed: updateData.passed,
        ai_verdict: updateData.ai_verdict,
        feedback_length: updateData.ai_feedback.length,
        analyzed_at: updateData.analyzed_at
      });

      const { error: updateError } = await supabase
        .from('job_readiness_ai_interview_submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (updateError) {
        console.error('❌ Failed to update submission with analysis:', updateError);
        console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
        throw new Error('Failed to save analysis results');
      }

      console.log('✅ Database updated successfully!');

      // Verify the update worked
      console.log('🔍 Verifying database update...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('job_readiness_ai_interview_submissions')
        .select('id, status, score, passed, ai_verdict, analyzed_at')
        .eq('id', submissionId)
        .single();

      if (verifyError) {
        console.error('❌ Failed to verify update:', verifyError);
      } else {
        console.log('✅ Verification successful:', verifyData);
      }

      console.log('🎉 Interview analysis completed successfully');

      return {
        success: true,
        feedback,
        analysisResult,
        verdict: finalVerdict,
        score: overallScore,
        message: 'Interview analyzed successfully'
      };

    } catch (geminiError) {
      const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown error';
      console.error('❌ Gemini API error:', geminiError);
      
      console.log('🔄 Updating status to error due to Gemini failure...');
      const { error: geminiErrorUpdateError } = await supabase
        .from('job_readiness_ai_interview_submissions')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (geminiErrorUpdateError) {
        console.error('❌ Failed to update error status after Gemini failure:', geminiErrorUpdateError);
      } else {
        console.log('✅ Status updated to error after Gemini failure');
      }

      throw new Error('Failed to analyze video with AI');
    } finally {
      // Clean up temporary file
      if (tempFileCreated) {
        try {
          console.log('🧹 Cleaning up temporary file...');
          unlinkSync(tempFilePath);
          console.log('✅ Cleaned up temporary file:', tempFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup temporary file:', cleanupError);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in video analysis:', error);
    console.error('❌ Full error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
} 