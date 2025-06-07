"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Target } from "lucide-react"

interface ProjectAIFeedbackDisplayProps {
  feedback: string | object
}

export function ProjectAIFeedbackDisplay({ feedback }: ProjectAIFeedbackDisplayProps) {
  let parsedFeedback = null
  
  try {
    parsedFeedback = typeof feedback === 'string' ? JSON.parse(feedback) : feedback
  } catch (e) {
    // If parsing fails, display as raw text with better formatting
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            AI Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 w-full">
            <div className="p-3 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  if (!parsedFeedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No AI feedback available</div>
        </CardContent>
      </Card>
    )
  }

  // Extract the structured feedback fields
  const {
    summary,
    strengths = [],
    weaknesses = [],
    improvements = [],
    overall_assessment,
    score,
    passed,
    verdict,
    grade,
    detailed_feedback,
    recommendations = []
  } = parsedFeedback

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      {(summary || overall_assessment) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Overall Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
                {summary || overall_assessment}
              </p>
            </div>
            
            {/* Show score/grade if available */}
            {(score !== undefined || grade !== undefined || passed !== undefined) && (
              <div className="mt-4 flex items-center gap-4">
                {(score !== undefined || grade !== undefined) && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Score: </span>
                    <span className="text-lg font-bold text-blue-600">
                      {score || grade}%
                    </span>
                  </div>
                )}
                {passed !== undefined && (
                  <Badge variant={passed ? "default" : "destructive"}>
                    {passed ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {passed ? "Pass" : "Fail"}
                  </Badge>
                )}
                {verdict && (
                  <Badge variant="outline">
                    {verdict}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Strengths ({strengths.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strengths.map((strength: string, index: number) => (
                <div key={index} className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-green-900 dark:text-green-100">{strength}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weaknesses */}
      {weaknesses && weaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Areas of Concern ({weaknesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weaknesses.map((weakness: string, index: number) => (
                <div key={index} className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-red-900 dark:text-red-100">{weakness}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvements */}
      {improvements && improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              Recommendations for Improvement ({improvements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {improvements.map((improvement: string, index: number) => (
                <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-yellow-900 dark:text-yellow-100">{improvement}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Additional Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec: any, index: number) => (
                <div key={index} className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                  {typeof rec === 'string' ? (
                    <p className="text-sm leading-relaxed text-purple-900 dark:text-purple-100">{rec}</p>
                  ) : (
                    <>
                      <h4 className="font-medium text-sm mb-1 text-purple-900 dark:text-purple-100">{rec.title || rec.area}</h4>
                      <p className="text-sm leading-relaxed text-purple-900 dark:text-purple-100">{rec.description || rec.suggestion}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Feedback (fallback for other formats) */}
      {detailed_feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 w-full">
              <div className="p-3 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {detailed_feedback}
                </pre>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 