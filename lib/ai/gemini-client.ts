import { GoogleGenAI } from '@google/genai';

// Type definitions for structured responses
export interface GeminiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

/**
 * Initializes the Google Generative AI client
 * @returns The Gemini API client instance
 */
export function initGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured in environment variables');
  }
  
  return new GoogleGenAI({ apiKey });
}

/**
 * Default safety settings for Gemini API calls
 * These are moderate settings that balance safety and utility
 */
export const defaultSafetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

/**
 * Makes a call to the Gemini API with structured output
 * 
 * @param prompt The text prompt to send to the API
 * @param temperature Controls randomness (0.0 = deterministic, 1.0 = creative)
 * @param modelName The Gemini model to use
 * @param structuredOutputSchema Optional JSON schema for structured output
 * @returns A promise that resolves to the structured response
 */
export async function callGeminiAPI<T>(
  prompt: string,
  temperature: number = 0.7,
  modelName: string = 'gemini-2.0-flash',
  structuredOutputSchema?: object
): Promise<GeminiResponse<T>> {
  try {
    const ai = initGeminiClient();
    
    const generationConfig = {
      temperature,
      topP: 1,
      topK: 16,
      maxOutputTokens: 8192,
    };
    
    // Use structured output if a schema is provided
    if (structuredOutputSchema) {
      // Add responseSchema and responseMimeType for proper structured output
      const structuredGenerationConfig = {
        ...generationConfig,
        responseMimeType: "application/json",
        responseSchema: structuredOutputSchema
      };
      
      const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        config: structuredGenerationConfig
      });
      
      const text = result.text || '';
      try {
        // The API should return properly formatted JSON now
        const jsonData = JSON.parse(text) as T;
        return { data: jsonData, success: true };
      } catch (parseError) {
        console.error('Error parsing JSON from Gemini API response:', text);
        return {
          data: null as unknown as T,
          success: false,
          error: 'Failed to parse structured response as JSON',
        };
      }
    } else {
      // For non-structured output, proceed as before
      const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }],
        config: generationConfig
      });
      
      const text = result.text || '';
      
      // For non-structured responses, attempt to parse JSON if possible
      try {
        const jsonData = JSON.parse(text) as T;
        return { data: jsonData, success: true };
      } catch (parseError) {
        // If it's not valid JSON, return the raw text
        return { data: text as unknown as T, success: true };
      }
    }
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return {
      data: null as unknown as T,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function that provides retry logic for Gemini API calls
 * 
 * @param promptFn Function that returns the prompt to send
 * @param options Configuration options for the API call
 * @param maxRetries Maximum number of retry attempts
 * @returns A promise that resolves to the API response
 */
export async function callGeminiWithRetry<T>(
  promptFn: () => string,
  options: {
    temperature?: number;
    modelName?: string;
    structuredOutputSchema?: object;
  },
  maxRetries: number = 3
): Promise<GeminiResponse<T>> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    const result = await callGeminiAPI<T>(
      promptFn(),
      options.temperature,
      options.modelName,
      options.structuredOutputSchema
    );
    
    if (result.success) {
      return result;
    }

    // Log the error for the current attempt in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Attempt ${attempts} failed for Gemini call:`, result.error);
    }
    
    // Wait before retrying (exponential backoff)
    if (attempts < maxRetries) {
      const delay = Math.pow(2, attempts) * 500; // 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    data: null as unknown as T,
    success: false,
    error: `Failed after ${maxRetries} attempts`,
  };
}

/**
 * Logs important AI API call information for monitoring and debugging
 * 
 * @param serviceName Name of the AI service making the call
 * @param prompt The prompt that was sent
 * @param result The result that was received
 * @param metadata Additional metadata to log
 */
export function logAICall(
  serviceName: string,
  prompt: string,
  result: any,
  metadata: Record<string, any> = {}
) {
  // In production, this would likely use a structured logging system
  console.log({
    timestamp: new Date().toISOString(),
    service: serviceName,
    prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
    result: typeof result === 'string' ? result.substring(0, 200) + (result.length > 200 ? '...' : '') : result,
    metadata,
  });
} 