"use client"

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
// Import the type
import type { ClientUsageMetrics } from "@/app/actions/analytics-optimized"; 

// Define props
interface ClientUsageProps {
  clientMetrics?: ClientUsageMetrics[];
  error?: string;
}

const ITEMS_PER_PAGE = 5;

export function ClientUsage({ clientMetrics, error }: ClientUsageProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (error) {
    return <div className="text-red-500 p-4">Error loading client usage: {error}</div>;
  }

  if (!clientMetrics) {
    return <div className="p-4">Loading client usage...</div>; // Or a skeleton loader
  }

  if (clientMetrics.length === 0) {
    return <div className="p-4">No client usage data available.</div>;
  }

  // Pagination calculations
  const totalPages = Math.ceil(clientMetrics.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentClients = clientMetrics.slice(startIndex, endIndex);

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
              <TableHead>Client Name</TableHead>
              <TableHead className="text-right">Active Learners</TableHead>
              <TableHead className="text-right">Avg. Product Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentClients.map((client) => (
              <TableRow key={client.clientId}>
                <TableCell className="font-medium">{client.clientName}</TableCell>
                <TableCell className="text-right">{client.activeLearnersInClient}</TableCell>
                <TableCell className="text-right">{client.averageProductProgressInClient.toFixed(1)}%</TableCell>
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
