import { GoogleGenAI } from "@google/genai";
import { InterviewQuestion, InterviewQuestionsResponse } from "../types";
import { Background, StudentProfile, buildQuestionGenerationPrompt } from "./interview-config";

// Schema for structured question generation using the correct format
const InterviewQuestionsSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the question"
          },
          question_text: {
            type: "string",
            description: "The interview question text"
          },
          category: {
            type: "string",
            description: "Question category (technical, behavioral, etc.)"
          },
          difficulty: {
            type: "string",
            description: "Question difficulty level (bronze, silver, gold)"
          }
        },
        required: ["id", "question_text", "category", "difficulty"]
      }
    },
    cached: {
      type: "boolean",
      description: "Whether these questions were retrieved from cache"
    }
  },
  required: ["questions", "cached"]
};

export async function generateInterviewQuestions(
  background: Background,
  userProfile: StudentProfile,
  questionQuantity: number = 5
): Promise<InterviewQuestionsResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = buildQuestionGenerationPrompt(
      background.id,
      background,
      userProfile,
      questionQuantity
    );
    
    console.log('Generating questions with structured output prompt:', prompt);
    
    // Use structured output with the correct API pattern
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ 
        role: 'user', 
        parts: [{ text: prompt }] 
      }],
      config: {
        temperature: 0.7,
        topP: 1,
        topK: 16,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: InterviewQuestionsSchema
      }
    });
    
    const text = result.text || '';
    console.log('Generated questions response:', text);
    
    const parsedResponse = JSON.parse(text);
    
    // Add unique IDs if not provided
    const questionsWithIds = parsedResponse.questions.map((q: any, index: number) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${index}`
    }));
    
    return {
      questions: questionsWithIds,
      cached: false
    };
    
  } catch (error) {
    console.error('Error generating interview questions:', error);
    
    // Fallback to default questions if generation fails
    return {
      questions: getDefaultQuestions(background, userProfile, questionQuantity),
      cached: false
    };
  }
}

// Alternative approach using standard text generation if structured outputs aren't available
export async function generateInterviewQuestionsText(
  background: Background,
  userProfile: StudentProfile,
  questionQuantity: number = 8
): Promise<InterviewQuestionsResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `${buildQuestionGenerationPrompt(background.id, background, userProfile, questionQuantity)}

Please respond with a valid JSON object in this exact format:
{
  "questions": [
    {
      "id": "unique_id_here",
      "question_text": "The interview question",
      "category": "technical|behavioral|communication|professional|motivation",
      "difficulty": "${userProfile.job_readiness_tier.toLowerCase()}"
    }
  ],
  "cached": false
}`;
    
    console.log('Generating questions with text prompt');
    
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ 
        role: 'user', 
        parts: [{ text: prompt }] 
      }],
      config: {
        temperature: 0.7,
        topP: 1,
        topK: 16,
        maxOutputTokens: 4096
      }
    });
    
    const text = result.text || '';
    console.log('Generated questions response:', text);
    
    // Extract JSON from the response (handle cases where response includes extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    // Add unique IDs if not provided
    const questionsWithIds = parsedResponse.questions.map((q: any, index: number) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${index}`
    }));
    
    return {
      questions: questionsWithIds,
      cached: false
    };
    
  } catch (error) {
    console.error('Error generating interview questions:', error);
    
    // Fallback to default questions if generation fails
    return {
      questions: getDefaultQuestions(background, userProfile, questionQuantity),
      cached: false
    };
  }
}

function getDefaultQuestions(
  background: Background,
  userProfile: StudentProfile,
  questionQuantity: number = 8
): InterviewQuestion[] {
  const tierLevel = userProfile.job_readiness_tier.toLowerCase();
  
  const baseQuestions: InterviewQuestion[] = [
    {
      id: "default_1",
      question_text: `What interests you most about ${background.name}?`
    },
    {
      id: "default_2", 
      question_text: "How do you handle challenging situations at work or school?"
    },
    {
      id: "default_3",
      question_text: "What's your strongest skill in this field?"
    },
    {
      id: "default_4",
      question_text: "Describe your experience working in teams."
    },
    {
      id: "default_5",
      question_text: "What are your career goals for the next few years?"
    },
    {
      id: "default_6",
      question_text: "How do you respond to feedback?"
    },
    {
      id: "default_7",
      question_text: "Tell me about a time you learned something new quickly."
    },
    {
      id: "default_8",
      question_text: "What skills do you think are most important for success in this field?"
    },
    {
      id: "default_9",
      question_text: "What's a recent accomplishment you're proud of?"
    },
    {
      id: "default_10",
      question_text: "How do you manage multiple tasks with deadlines?"
    },
    {
      id: "default_11",
      question_text: "Why are you interested in this particular field?"
    },
    {
      id: "default_12",
      question_text: "How do you approach problem-solving?"
    }
  ];
  
  // Return exactly the requested number of questions
  return baseQuestions.slice(0, questionQuantity);
}

// Cache management for questions (optional enhancement)
const questionCache = new Map<string, { questions: InterviewQuestion[], timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedQuestions(
  backgroundId: string,
  userProfileId: string
): InterviewQuestion[] | null {
  const cacheKey = `${backgroundId}_${userProfileId}`;
  const cached = questionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.questions;
  }
  
  return null;
}

export function cacheQuestions(
  backgroundId: string,
  userProfileId: string,
  questions: InterviewQuestion[]
): void {
  const cacheKey = `${backgroundId}_${userProfileId}`;
  questionCache.set(cacheKey, {
    questions,
    timestamp: Date.now()
  });
} 