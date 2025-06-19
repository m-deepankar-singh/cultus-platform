"use client"

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
// Import the type, aliased to avoid naming conflict with component
import type { ProductPerformance as ProductPerformanceData } from "@/app/actions/analytics"; 

// Define props
interface ProductPerformanceProps {
  products?: ProductPerformanceData[];
  error?: string;
}

const ITEMS_PER_PAGE = 5;

export function ProductPerformance({ products, error }: ProductPerformanceProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (error) {
    return <div className="text-red-500 p-4">Error loading product performance: {error}</div>;
  }

  if (!products) {
    return <div className="p-4">Loading product performance...</div>; // Or a skeleton loader
  }

  if (products.length === 0) {
    return <div className="p-4">No product performance data available.</div>;
  }

  // Pagination calculations
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div> {/* Wrapper for table and pagination */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Avg. Progress</TableHead>
              <TableHead className="text-right">Completion Rate</TableHead>
              <TableHead className="text-right">Eligible</TableHead>
              <TableHead className="text-right">Engaged</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">In Progress</TableHead>
              <TableHead className="text-right">Not Started</TableHead>
              {/* Removed Enrollments, Completions (old columns), Avg Score, Trend, Actions */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProducts.map((product) => (
              <TableRow key={product.productId}>
                <TableCell className="font-medium">{product.productName}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Optional: Add Progress bar? */}
                    {/* <Progress value={product.averageOverallProductProgress} className="h-2 w-[60px]" /> */}
                    <span>{product.averageOverallProductProgress.toFixed(1)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{product.completionRate !== undefined ? product.completionRate.toFixed(1) : 'N/A'}%</TableCell>
                <TableCell className="text-right">{product.totalEligibleLearners}</TableCell>
                <TableCell className="text-right">{product.totalEngagedLearners}</TableCell>
                <TableCell className="text-right">{product.completedCount}</TableCell>
                <TableCell className="text-right">{product.inProgressCount}</TableCell>
                <TableCell className="text-right">{product.notStartedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
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
