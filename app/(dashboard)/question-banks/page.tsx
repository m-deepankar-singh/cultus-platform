import { Metadata } from 'next';
import QuestionList from '@/components/question-banks/question-list';
import { createClient } from '@/lib/supabase/server';
import { QuestionBankHeader } from '@/components/question-banks/question-bank-header';

export const metadata: Metadata = {
  title: 'Question Banks',
  description: 'Manage course and assessment questions',
};

export default async function QuestionBanksPage() {
  const supabase = await createClient();
  
  // Fetch questions
  const { data, error } = await supabase
    .from('assessment_questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
  }

  // Add bankType to all questions
  const allQuestions = (data || []).map(q => ({ ...q, bankType: 'assessment' }));
  // Optional: Sort combined list if needed, e.g., by created_at
  allQuestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    // Apply standard page padding and layout
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <QuestionBankHeader />
      {/* Remove Tabs */}
      <QuestionList questions={allQuestions} /> {/* Pass combined data */}
      {/* Remove type prop if QuestionList doesn't need it anymore */}
    </div>
  );
}
