'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { QuestionForm } from './question-form';

export function QuestionBankHeader() {
  const [open, setOpen] = useState(false);
  const [bankType, setBankType] = useState<'assessment' | 'course'>('assessment');

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Question Banks</h2>
        <p className="text-muted-foreground">
          Manage assessment and course questions
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => {
            setBankType('assessment');
            setOpen(true);
          }}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Assessment Question
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => {
            setBankType('course');
            setOpen(true);
          }}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Course Question
        </Button>
      </div>
      <QuestionForm open={open} onOpenChange={setOpen} bankType={bankType} />
    </div>
  );
} 