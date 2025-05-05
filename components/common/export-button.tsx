"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ExportButtonProps {
  endpoint: string;
  params?: Record<string, string>;
  fileName?: string;
  variant?: "default" | "outline" | "secondary";
}

export function ExportButton({
  endpoint,
  params = {},
  fileName = "export.xlsx",
  variant = "outline",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build query string from params
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from Content-Disposition if available
      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadFileName = fileName;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFileName = filenameMatch[1];
        }
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create an object URL for the blob
      const url2 = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = document.createElement("a");
      link.href = url2;
      link.setAttribute("download", downloadFileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url2);
      
      toast({
        title: "Export successful",
        description: `${downloadFileName} has been downloaded`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export to Excel"}
    </Button>
  );
} 