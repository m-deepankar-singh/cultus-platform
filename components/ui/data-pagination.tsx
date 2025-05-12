"use client";

import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showDisplayText?: boolean;
}

/**
 * A reusable pagination component for data tables and lists
 * 
 * This component handles the UI for navigating between pages and shows pagination
 * information such as current page and total pages.
 */
export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showDisplayText = true
}: DataPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate array of page numbers to display, max 5 pages
  const getPageNumbers = () => {
    // For 5 or fewer pages, show all pages
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // For more than 5 pages, calculate which pages to show
    let startPage = Math.max(currentPage - 2, 1);
    let endPage = startPage + 4;
    
    // Adjust if we're near the end
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - 4, 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between py-4">
      {showDisplayText && (
        <div className="text-sm text-muted-foreground text-center sm:text-left py-2 sm:py-0">
          {totalItems > 0
            ? `Showing ${startItem}-${endItem} of ${totalItems} entries`
            : "No entries to display"}
        </div>
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 ? onPageChange(currentPage - 1) : undefined}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {/* First page if not in view */}
          {totalPages > 5 && !pageNumbers.includes(1) && (
            <>
              <PaginationItem>
                <PaginationLink 
                  onClick={() => onPageChange(1)}
                  isActive={currentPage === 1}
                  className="cursor-pointer"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {!pageNumbers.includes(2) && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {/* Page numbers */}
          {pageNumbers.map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => onPageChange(pageNum)}
                isActive={currentPage === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}

          {/* Last page if not in view */}
          {totalPages > 5 && !pageNumbers.includes(totalPages) && (
            <>
              {!pageNumbers.includes(totalPages - 1) && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink 
                  onClick={() => onPageChange(totalPages)}
                  isActive={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages ? onPageChange(currentPage + 1) : undefined}
              aria-disabled={currentPage === totalPages || totalPages === 0}
              className={(currentPage === totalPages || totalPages === 0) ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
} 