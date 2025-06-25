import { Metadata } from 'next';
import { Suspense } from 'react';
import { VirtualizedQuestionBanksTableWrapper, VirtualizedQuestionBanksTableSkeleton } from '@/components/question-banks/virtualized-question-banks-table-wrapper';

export const metadata: Metadata = {
  title: 'Question Banks',
  description: 'Manage course and assessment questions',
};

export const dynamic = 'force-dynamic';

export default function QuestionBanksPage() {
  return (
    <Suspense fallback={<VirtualizedQuestionBanksTableSkeleton />}>
      <VirtualizedQuestionBanksTableWrapper />
    </Suspense>
  );
}
