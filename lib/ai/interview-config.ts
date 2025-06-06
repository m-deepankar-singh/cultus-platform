import { LiveConnectConfig, Modality } from "@google/genai";
import { InterviewQuestion } from "../types";

export interface Background {
  id: string;
  name: string;
  description: string;
  skills: string[];
  focus_areas: string[];
}

export interface StudentProfile {
  id: string;
  full_name: string;
  background_type: string;
  job_readiness_tier: string;
  job_readiness_star_level: string | null;
}

export function createInterviewConfig(
  systemPrompt: string
): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: "Aoede" }
      }
    },
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    // Note: Session duration and compression will be handled at the client level
  };
}

export function buildInterviewSystemPrompt(
  questions: InterviewQuestion[],
  background: Background,
  studentProfile: StudentProfile
): string {
  const questionsText = questions.map((q, index) => 
    `${index + 1}. ${q.question_text}`
  ).join('\n');

  return `**YOU ARE THE INTERVIEWER** - You conduct the interview by asking questions, NOT by waiting for the candidate to ask you questions.

## Your Role
You are an AI interviewer conducting a professional job interview simulation for a ${background.name} candidate. This is a 5-minute interview to assess their employment readiness.

## Interview Context
- **Candidate**: ${studentProfile.full_name}
- **Background**: ${background.name}
- **Current Level**: ${studentProfile.job_readiness_tier} tier, ${studentProfile.job_readiness_star_level || '0'} star
- **Focus Areas**: ${background.focus_areas.join(', ')}
- **Key Skills**: ${background.skills.join(', ')}

## YOUR QUESTIONS TO ASK
You must ask these questions during the interview:

${questionsText}

## CRITICAL INSTRUCTIONS

### YOU LEAD THE INTERVIEW
- **YOU ask the questions** - Do NOT wait for the candidate to ask you questions
- **Start immediately** with a greeting and your first question
- **You control the flow** - Move between questions naturally
- **Ask follow-up questions** based on their responses

### Conversation Flow (YOU initiate each step)
1. **Opening (30 seconds)**: 
   - Greet: "Hello ${studentProfile.full_name}! Welcome to your ${background.name} interview."
   - Explain: "I'll be asking you several questions over the next 5 minutes to assess your readiness."
   - **IMMEDIATELY ask your first question**

2. **Main Questions (3-4 minutes)**: 
   - Ask 3-4 questions from your list above
   - Ask natural follow-up questions based on responses
   - Keep responses moving with brief acknowledgments

3. **Closing (30 seconds)**: 
   - Thank them and conclude the interview

### Interview Style
- **Be conversational and encouraging** - This helps them improve
- **Ask follow-up questions** - Dig deeper into responses
- **Stay positive** - Encouraging tone throughout
- **Be time-conscious** - 5 minutes total, so keep moving

### Response Guidelines
- **Keep your responses concise** (1-2 sentences typically)
- **Ask ONE question at a time**
- **Give brief acknowledgments** ("Great point", "That's interesting") then move to next question
- **If they ask you questions**, briefly answer and redirect: "That's a good question. Let me ask you about..."

### IMPORTANT REMINDERS
- **YOU ARE THE INTERVIEWER** - You ask questions, they answer
- **This is AUDIO-ONLY** - You cannot see the candidate
- **Start immediately** - No need to wait or ask if they're ready
- **Do not provide final assessment** - That will be done separately
- **Interview automatically ends after 5 minutes**

**START NOW**: Begin immediately with: "Hello ${studentProfile.full_name}! Welcome to your ${background.name} interview. I'm excited to learn more about your background and experience. Let's start with my first question: [ask first question from your list]"`;
}

export function buildQuestionGenerationPrompt(
  backgroundId: string,
  background: Background,
  userProfile: StudentProfile,
  questionQuantity: number = 8
): string {
  return `Generate exactly ${questionQuantity} interview questions for a ${background.name} candidate at the ${userProfile.job_readiness_tier} tier level.

## Background Information
- **Field**: ${background.name}
- **Description**: ${background.description}
- **Key Skills**: ${background.skills.join(', ')}
- **Focus Areas**: ${background.focus_areas.join(', ')}

## Candidate Profile
- **Name**: ${userProfile.full_name}
- **Tier**: ${userProfile.job_readiness_tier}
- **Star Level**: ${userProfile.job_readiness_star_level || '0'}

## Question Requirements

### IMPORTANT: Generate exactly ${questionQuantity} questions - no more, no less.

### Difficulty Level (${userProfile.job_readiness_tier} Tier)
- **Bronze**: Entry-level questions focusing on basic concepts, motivation, and foundational knowledge
- **Silver**: Intermediate questions including practical scenarios, problem-solving, and some technical depth
- **Gold**: Advanced questions with complex scenarios, leadership situations, and deep technical expertise

### Question Categories (distribute evenly across ${questionQuantity} questions):
1. **Technical Competence**: Field-specific knowledge and skills
2. **Problem Solving**: How they approach challenges and think through solutions
3. **Communication**: Ability to explain concepts and collaborate
4. **Professional Behavior**: Work ethic, teamwork, and professional situations
5. **Motivation & Goals**: Career aspirations and commitment to the field

### Question Format
- Each question should be clear and specific
- Include both behavioral ("Tell me about a time...") and situational ("How would you handle...") questions
- Ensure questions are appropriate for someone entering the workforce
- Make questions engaging and relevant to current industry practices

### Background-Specific Focus
For ${background.name}, emphasize questions related to:
${background.focus_areas.map(area => `- ${area}`).join('\n')}

Generate exactly ${questionQuantity} questions that will help assess if this candidate is ready for entry-level employment in ${background.name}.`;
} 