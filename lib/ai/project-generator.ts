import { createClient } from '@supabase/supabase-js';
import { callGeminiWithRetry, logAICall } from './gemini-client';

// Define types for project generation
interface ProjectDetails {
  title: string;
  description: string;
  tasks: string[];
  deliverables: string[];
  submission_type: 'text_input';
}

interface ProjectGenerationResult {
  projectDetails: ProjectDetails;
  generationSource: 'ai' | 'fallback';
}



/**
 * Generates a real-world project based on student background and tier
 * 
 * @param studentId ID of the student
 * @param productId ID of the product
 * @returns Generated project details with source info or null if generation fails
 */
export async function generateProject(
  studentId: string,
  productId: string
): Promise<ProjectGenerationResult | null> {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Fetch student details
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, job_readiness_background_type, job_readiness_tier')
      .eq('id', studentId)
      .single();
      
    if (studentError || !studentData) {
      console.error('Error fetching student data:', studentError);
      return null;
    }
    
    const backgroundType = studentData.job_readiness_background_type;
    const studentTier = studentData.job_readiness_tier;
    
    if (!backgroundType || !studentTier) {
      console.error('Student is missing background type or tier', { 
        studentId, 
        backgroundType, 
        studentTier 
      });
      const fallbackProject = await getFallbackProject(backgroundType, studentTier);
      if (fallbackProject) {
        return { projectDetails: fallbackProject, generationSource: 'fallback' };
      }
      return null;
    }
    
    
    // Step 2: Fetch project configuration
    const { data: projectConfig, error: configError } = await supabase
      .from('job_readiness_background_project_types')
      .select(`
        background_type,
        bronze_system_prompt,
        bronze_input_prompt,
        silver_system_prompt,
        silver_input_prompt,
        gold_system_prompt,
        gold_input_prompt
      `)
      .eq('background_type', backgroundType)
      .single();
      
    if (configError || !projectConfig) {
      console.error('Error fetching project configuration:', configError);
      const fallbackProject = await getFallbackProject(backgroundType, studentTier);
      if (fallbackProject) {
        return { projectDetails: fallbackProject, generationSource: 'fallback' };
      }
      return null;
    }
    
    
    // Get prompt based on student tier
    let systemPrompt: string | undefined;
    let inputPrompt: string | undefined;
    
    switch (studentTier) {
      case 'BRONZE':
        systemPrompt = projectConfig.bronze_system_prompt;
        inputPrompt = projectConfig.bronze_input_prompt;
        break;
      case 'SILVER':
        systemPrompt = projectConfig.silver_system_prompt;
        inputPrompt = projectConfig.silver_input_prompt;
        break;
      case 'GOLD':
        systemPrompt = projectConfig.gold_system_prompt;
        inputPrompt = projectConfig.gold_input_prompt;
        break;
    }
    
    if (!inputPrompt) {
      console.error('No prompt found for tier', { backgroundType, studentTier });
      const fallbackProject = await getFallbackProject(backgroundType, studentTier);
      if (fallbackProject) {
        return { projectDetails: fallbackProject, generationSource: 'fallback' };
      }
      return null;
    }
    
    // Step 3: Call Gemini API with structured output schema
    const structuredOutputSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        tasks: { 
          type: 'array',
          items: { type: 'string' }
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' }
        },
        submission_type: { 
          type: 'string', 
          enum: ['text_input'] 
        }
      },
      required: ['title', 'description', 'tasks', 'deliverables', 'submission_type']
    };
    
    const generatePromptFn = () => constructProjectPrompt(systemPrompt || "", inputPrompt, backgroundType, studentTier);
    
    const result = await callGeminiWithRetry<ProjectDetails>(
      generatePromptFn,
      {
        temperature: 0.7, // Allow some creativity in project generation
        structuredOutputSchema
      }
    );
    
    // Log the AI call (excluding full prompt/response in production)
    logAICall('project-generator', generatePromptFn(), result, {
      studentId,
      productId,
      backgroundType,
      studentTier
    });
    
    if (!result.success || !result.data) {
      console.error('Failed to generate project:', result.error);
      const fallbackProject = await getFallbackProject(backgroundType, studentTier);
      if (fallbackProject) {
        return { projectDetails: fallbackProject, generationSource: 'fallback' };
      }
      return null;
    }
    
    // Step 4: Process and validate AI response
    const projectDetails = result.data;
    
    // Validate the structure and content of generated project
    if (!validateProjectDetails(projectDetails)) {
      console.error('Generated project failed validation');
      const fallbackProject = await getFallbackProject(backgroundType, studentTier);
      if (fallbackProject) {
        return { projectDetails: fallbackProject, generationSource: 'fallback' };
      }
      return null;
    }
    
    // Step 5: Return generated project details with AI source
    return { projectDetails, generationSource: 'ai' };
  } catch (error) {
    console.error('Error in generateProject:', error);
    return null;
  }
}

/**
 * Helper function to construct the prompt for project generation
 */
function constructProjectPrompt(
  systemPrompt: string,
  inputPrompt: string,
  backgroundType: string,
  studentTier: string
): string {
  return `
${systemPrompt || `You are an expert project creator for ${backgroundType} professionals.
Create a realistic project suitable for a ${studentTier} level student.`}

${inputPrompt}

Your response must be a JSON object with these exact fields:
- title: A concise, professional project title
- description: A detailed description of the project (200-300 words)
- tasks: An array of 3-5 specific tasks the student must complete
- deliverables: An array of specific items the student must submit
- submission_type: Always "text_input" (for code projects, students use GitIngest to extract code and paste as text)

Format your response as valid JSON only, no other text.
`;
}

/**
 * Validates the generated project details
 */
function validateProjectDetails(project: ProjectDetails): boolean {
  // Check if all required fields are present and non-empty
  if (!project.title || !project.description) {
    return false;
  }
  
  // Ensure tasks and deliverables are arrays with at least one item
  if (!Array.isArray(project.tasks) || project.tasks.length === 0) {
    return false;
  }
  
  if (!Array.isArray(project.deliverables) || project.deliverables.length === 0) {
    return false;
  }
  
  // Validate submission type
  if (project.submission_type !== 'text_input') {
    return false;
  }
  
  return true;
}

/**
 * Gets a fallback project if AI generation fails
 */
async function getFallbackProject(
  backgroundType: string | null,
  studentTier: 'BRONZE' | 'SILVER' | 'GOLD' | null
): Promise<ProjectDetails | null> {
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Default to BUSINESS_ADMINISTRATION background if null, and BRONZE tier if null
    const fallbackBackground = backgroundType || 'BUSINESS_ADMINISTRATION';
    const fallbackTier = studentTier || 'BRONZE';
    
    
    // Try to get a generic project configuration
    const { data: fallbackConfig, error: fallbackError } = await supabase
      .from('job_readiness_background_project_types')
      .select(`
        background_type,
        bronze_system_prompt,
        bronze_input_prompt,
        silver_system_prompt,
        silver_input_prompt,
        gold_system_prompt,
        gold_input_prompt
      `)
      .eq('background_type', fallbackBackground)
      .single();
      
    if (fallbackError || !fallbackConfig) {
      console.error('Failed to fetch fallback project, using generic fallback:', fallbackError);
      
      // Return a completely generic project as last resort
      return {
        title: "Business Case Study Analysis",
        description: "Analyze a business scenario and provide strategic recommendations based on your understanding of business principles and market dynamics.",
        tasks: [
          "Read and understand the provided business scenario",
          "Identify key challenges and opportunities",
          "Research relevant market trends and competitive landscape",
          "Develop strategic recommendations with supporting rationale",
          "Present your analysis in a structured format"
        ],
        deliverables: [
          "Executive summary (2-3 paragraphs)",
          "Problem identification and analysis",
          "Strategic recommendations with justification",
          "Implementation timeline and key milestones",
          "Risk assessment and mitigation strategies"
        ],
        submission_type: "text_input"
      };
    }
    
    // Use the fallback configuration with appropriate prompts
    let systemPrompt: string;
    let inputPrompt: string;
    
    switch (fallbackTier) {
      case 'BRONZE':
        systemPrompt = fallbackConfig.bronze_system_prompt;
        inputPrompt = fallbackConfig.bronze_input_prompt;
        break;
      case 'SILVER':
        systemPrompt = fallbackConfig.silver_system_prompt;
        inputPrompt = fallbackConfig.silver_input_prompt;
        break;
      case 'GOLD':
        systemPrompt = fallbackConfig.gold_system_prompt;
        inputPrompt = fallbackConfig.gold_input_prompt;
        break;
    }
    
    // Generate project using AI with fallback configuration
    const structuredOutputSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        tasks: { 
          type: 'array',
          items: { type: 'string' }
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' }
        },
        submission_type: { 
          type: 'string', 
          enum: ['text_input'] 
        }
      },
      required: ['title', 'description', 'tasks', 'deliverables', 'submission_type']
    };
    
    const generatePromptFn = () => constructProjectPrompt(systemPrompt, inputPrompt, fallbackBackground, fallbackTier);
    
    const result = await callGeminiWithRetry<ProjectDetails>(
      generatePromptFn,
      {
        temperature: 0.7, // Allow some creativity in project generation
        structuredOutputSchema
      }
    );
    
    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('Failed to generate fallback project:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('Error in fallback project generation:', error);
    return null;
  }
} 