"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Users, TrendingUp, TrendingDown } from "lucide-react"
import type { JrPromotionExamAttempt } from "./jr-promotion-exam-attempts-table"

interface JrPromotionExamStatsProps {
  attempts: JrPromotionExamAttempt[]
}

export function JrPromotionExamStats({ attempts }: JrPromotionExamStatsProps) {
  // Calculate statistics
  const totalAttempts = attempts.length
  const completedAttempts = attempts.filter(attempt => attempt.status === 'COMPLETED')
  const passedAttempts = attempts.filter(attempt => attempt.passed === true)
  const failedAttempts = attempts.filter(attempt => attempt.passed === false)
  const inProgressAttempts = attempts.filter(attempt => attempt.status === 'IN_PROGRESS')
  
  const passRate = completedAttempts.length > 0 ? (passedAttempts.length / completedAttempts.length) * 100 : 0
  const averageScore = completedAttempts.length > 0 
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / completedAttempts.length 
    : 0

  // Calculate average time taken (only for completed attempts)
  const completedWithTime = completedAttempts.filter(attempt => attempt.timestamp_start && attempt.timestamp_end)
  const averageTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, attempt) => {
        const startTime = new Date(attempt.timestamp_start)
        const endTime = new Date(attempt.timestamp_end!)
        const timeTakenMs = endTime.getTime() - startTime.getTime()
        const timeTakenMinutes = Math.round(timeTakenMs / (1000 * 60))
        return sum + timeTakenMinutes
      }, 0) / completedWithTime.length
    : 0

  const stats = [
    {
      title: "Total Attempts",
      value: totalAttempts,
      icon: Users,
      description: "All exam attempts",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Pass Rate",
      value: `${passRate.toFixed(1)}%`,
      icon: passRate >= 70 ? TrendingUp : TrendingDown,
      description: `${passedAttempts.length}/${completedAttempts.length} passed`,
      color: passRate >= 70 ? "text-green-600" : "text-red-600",
      bgColor: passRate >= 70 ? "bg-green-50" : "bg-red-50",
      borderColor: passRate >= 70 ? "border-green-200" : "border-red-200",
    },
    {
      title: "Average Score",
      value: `${averageScore.toFixed(1)}%`,
      icon: CheckCircle,
      description: "For completed exams",
      color: averageScore >= 70 ? "text-green-600" : "text-orange-600",
      bgColor: averageScore >= 70 ? "bg-green-50" : "bg-orange-50",
      borderColor: averageScore >= 70 ? "border-green-200" : "border-orange-200",
    },
    {
      title: "Average Time",
      value: `${averageTime.toFixed(0)} min`,
      icon: Clock,
      description: "Time to complete",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className={`${stat.borderColor} border-2`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Additional component for status breakdown
export function JrPromotionExamStatusBreakdown({ attempts }: JrPromotionExamStatsProps) {
  const totalAttempts = attempts.length
  const passedAttempts = attempts.filter(attempt => attempt.passed === true).length
  const failedAttempts = attempts.filter(attempt => attempt.passed === false).length
  const inProgressAttempts = attempts.filter(attempt => attempt.status === 'IN_PROGRESS').length
  const abandonedAttempts = attempts.filter(attempt => attempt.status === 'ABANDONED').length

  if (totalAttempts === 0) {
    return (
      <div className="flex gap-2">
        <Badge variant="outline">0 Total Attempts</Badge>
      </div>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="outline">{totalAttempts} Total</Badge>
      {passedAttempts > 0 && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {passedAttempts} Passed
        </Badge>
      )}
      {failedAttempts > 0 && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          {failedAttempts} Failed
        </Badge>
      )}
      {inProgressAttempts > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          {inProgressAttempts} In Progress
        </Badge>
      )}
      {abandonedAttempts > 0 && (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          {abandonedAttempts} Abandoned
        </Badge>
      )}
    </div>
  )
} 