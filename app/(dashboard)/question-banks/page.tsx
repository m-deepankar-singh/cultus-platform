import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuestionList from '@/components/question-banks/question-list';
import { createClient } from '@/lib/supabase/server';
import { QuestionBankHeader } from '@/components/question-banks/question-bank-header';

export const metadata: Metadata = {
  title: 'Question Banks',
  description: 'Manage course and assessment questions',
};

export default async function QuestionBanksPage() {
  const supabase = await createClient();
  
  // Fetch assessment questions
  const { data: assessmentQuestions, error: assessmentError } = await supabase
    .from('assessment_questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (assessmentError) {
    console.error('Error fetching assessment questions:', assessmentError);
  }

  return (
    <div className="flex flex-col space-y-6">
      <QuestionBankHeader />
      
      <Tabs defaultValue="assessment" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assessment">Assessment Questions</TabsTrigger>
          <TabsTrigger value="course">Course Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="assessment">
          <QuestionList questions={assessmentQuestions || []} type="assessment" />
        </TabsContent>
        <TabsContent value="course">
          <QuestionList questions={assessmentQuestions || []} type="course" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
