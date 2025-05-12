import { Metadata } from 'next';
import QuestionList from '@/components/question-banks/question-list';
import { createClient } from '@/lib/supabase/server';
import { QuestionBankHeader } from '@/components/question-banks/question-bank-header';
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';

export const metadata: Metadata = {
  title: 'Question Banks',
  description: 'Manage course and assessment questions',
};

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

export default async function QuestionBanksPage({ 
  searchParams 
}: { 
  searchParams: SearchParams | Promise<SearchParams>
}) {
  // Ensure searchParams is awaited
  const params = await searchParams;
  
  const supabase = await createClient();
  
  // Parse pagination parameters - use the awaited params
  const page = params.page ? parseInt(params.page) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize) : 10;
  const search = params.search || '';
  
  // Calculate range for pagination
  const { from, to } = calculatePaginationRange(page, pageSize);
  
  // Fetch count for pagination
  const countQuery = supabase.from('assessment_questions').select('id', { count: 'exact' });
  
  if (search) {
    countQuery.ilike('question_text', `%${search}%`);
  }
  
  const { count, error: countError } = await countQuery;
  
  if (countError) {
    console.error('Error counting questions:', countError);
  }
  
  // Fetch questions with pagination
  const queryBuilder = supabase
    .from('assessment_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (search) {
    queryBuilder.ilike('question_text', `%${search}%`);
  }
  
  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error fetching questions:', error);
  }

  // Add bankType to all questions
  const formattedQuestions = (data || []).map(q => ({ ...q, bankType: 'assessment' as const }));
  
  // Create paginated response
  const paginatedResponse = createPaginatedResponse(
    formattedQuestions,
    count || 0,
    page,
    pageSize
  );

  return (
    // Apply standard page padding and layout
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <QuestionBankHeader />
      <QuestionList initialData={paginatedResponse} />
    </div>
  );
}
