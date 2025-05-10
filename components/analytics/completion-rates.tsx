"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModuleCompletionRate } from "@/app/actions/analytics"; // Import the type

// Define props for the component
interface CompletionRatesProps {
  rates?: ModuleCompletionRate[];
  error?: string;
}

const ITEMS_PER_PAGE = 5;

// Component now accepts props and manages pagination state
export function CompletionRates({ rates, error }: CompletionRatesProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (error) {
    return <div className="text-red-500 p-4">Error loading completion rates: {error}</div>;
  }

  if (!rates) {
    return <div className="p-4">Loading completion rates...</div>; // Or a skeleton loader
  }

  if (rates.length === 0) {
    return <div className="p-4">No module completion data available.</div>;
  }

  // Pagination calculations
  const totalPages = Math.ceil(rates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRates = rates.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Completion Rate</TableHead>
              <TableHead className="text-right">Eligible</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">In Progress</TableHead>
              <TableHead className="text-right">Not Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRates.map((rate) => (
              <TableRow key={rate.moduleId}>
                <TableCell className="font-medium">{rate.moduleName}</TableCell>
                <TableCell>
                  <Badge 
                    variant={rate.moduleType === 'Course' ? 'secondary' : 'outline'}
                    className={rate.moduleType === 'Course' ? "border-blue-200 bg-blue-50 text-blue-700" : "border-purple-200 bg-purple-50 text-purple-700"}
                  >
                    {rate.moduleType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{rate.completionRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{rate.totalEligibleStudents}</TableCell>
                <TableCell className="text-right">{rate.totalCompletedByEligible}</TableCell>
                <TableCell className="text-right">{rate.totalInProgressByEligible}</TableCell>
                <TableCell className="text-right">{rate.totalNotStartedByEligible}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
