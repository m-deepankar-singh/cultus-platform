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

interface StudentData {
  id: string;
  job_readiness_background_type: string;
  job_readiness_tier: 'BRONZE' | 'SILVER' | 'GOLD';
}

interface ProjectConfig {
  background_type: string;
  tier: string;
  bronze_system_prompt?: string;
  bronze_input_prompt?: string;
  silver_system_prompt?: string;
  silver_input_prompt?: string;
  gold_system_prompt?: string;
  gold_input_prompt?: string;
}

/**
 * Generates a real-world project based on student background and tier
 * 
 * @param studentId ID of the student
 * @param productId ID of the product
 * @returns Generated project details or null if generation fails
 */
export async function generateProject(
  studentId: string,
  productId: string
): Promise<ProjectDetails | null> {
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
      console.error('Student is missing background type or tier', { studentId });
      return await getFallbackProject(backgroundType, studentTier);
    }
    
    // Log the student data for debugging
    console.log('Student data for project generation:', { 
      backgroundType, 
      studentTier 
    });
    
    // Step 2: Fetch project configuration
    const { data: projectConfig, error: configError } = await supabase
      .from('job_readiness_background_project_types')
      .select('*')
      .eq('background_type', backgroundType)
      .single();
      
    if (configError || !projectConfig) {
      console.error('Error fetching project configuration:', configError);
      return await getFallbackProject(backgroundType, studentTier);
    }
    
    // Log the project config for debugging
    console.log('Project config found:', { 
      backgroundType,
      hasPrompts: {
        bronze: !!projectConfig.bronze_input_prompt,
        silver: !!projectConfig.silver_input_prompt,
        gold: !!projectConfig.gold_input_prompt
      }
    });
    
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
      return await getFallbackProject(backgroundType, studentTier);
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
      return await getFallbackProject(backgroundType, studentTier);
    }
    
    // Step 4: Process and validate AI response
    const projectDetails = result.data;
    
    // Validate the structure and content of generated project
    if (!validateProjectDetails(projectDetails)) {
      console.error('Generated project failed validation');
      return await getFallbackProject(backgroundType, studentTier);
    }
    
    // Step 5: Return generated project details
    return projectDetails;
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
  backgroundType: string,
  studentTier: string
): Promise<ProjectDetails | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Attempt to get a fallback project from the fallback table
    const { data: fallbackProject, error } = await supabase
      .from('job_readiness_fallback_projects')
      .select('*')
      .eq('background_type', backgroundType)
      .eq('tier', studentTier)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !fallbackProject) {
      console.error('Failed to fetch fallback project, using generic fallback:', error);
      
      // If no specific fallback is found, return a generic fallback
      return {
        title: "Professional Portfolio Project",
        description: "Build a professional portfolio showcasing your skills and achievements. This project will help you create a compelling presentation of your work for potential employers.",
        tasks: [
          "Create a structured outline of your professional skills and experience",
          "Develop a presentation format (document or website)",
          "Include at least 3 examples of your work or case studies"
        ],
        deliverables: [
          "Complete portfolio document or website URL",
          "Brief explanation of how you approached the project"
        ],
        submission_type: 'text_input'
      };
    }
    
    return {
      title: fallbackProject.project_title,
      description: fallbackProject.project_description,
      tasks: fallbackProject.tasks || [],
      deliverables: fallbackProject.deliverables || [],
      submission_type: 'text_input'
    };
  } catch (error) {
    console.error('Error in getFallbackProject:', error);
    return null;
  }
} 