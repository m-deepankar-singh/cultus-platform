"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Download, Loader2 } from "lucide-react"
import { ClientExportModal } from "./client-export-modal"

export function ExportLearnersButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const { toast } = useToast()

  const handleExport = async (clientId: string | undefined) => {
    setIsExporting(true)
    
    try {
      // Build the API URL with optional clientId parameter
      let url = "/api/admin/learners/export"
      if (clientId && clientId !== "all") {
        url += `?clientId=${encodeURIComponent(clientId)}`
      }
      
      const response = await fetch(url, {
        method: "GET",
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Failed to export learner data")
      }
      
      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = downloadUrl
      
      // Set the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = "learner_export.xlsx"
      
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      
      a.download = filename
      
      // Append to body, click the link, then clean up
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      
      toast({
        title: "Export successful",
        description: "Learner data has been exported successfully.",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export learner data",
      })
      // Re-throw the error so the modal can handle it
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setModalOpen(true)}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </>
        )}
      </Button>
      
      <ClientExportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onExport={handleExport}
      />
    </>
  )
} 