'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { QuestionForm } from './question-form';
import { BulkUploadQuestionDialog } from './bulk-upload-question-dialog';

export function QuestionBankHeader() {
  const [open, setOpen] = useState(false);
  const [bankType] = useState<'assessment' | 'course'>('assessment');

  const handleQuestionsBulkUploaded = () => {
    // Trigger a refresh of the question banks table
    // This will be handled by the parent component via event emission
    document.dispatchEvent(new CustomEvent('questionsBulkUploaded'));
  };

  return (
    <div className="px-6 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Banks</h1>
          <p className="text-muted-foreground">Manage assessment and course questions</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkUploadQuestionDialog onQuestionsBulkUploaded={handleQuestionsBulkUploaded} />
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              setOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Question
          </Button>
        </div>
      </div>
      <QuestionForm open={open} onOpenChange={setOpen} bankType={bankType} />
    </div>
  );
} 