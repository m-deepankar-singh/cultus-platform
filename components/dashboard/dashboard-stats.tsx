"use client"

import { BookOpen, Building2, GraduationCap, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardStats() {
  // In a real app, this data would come from an API
  const stats = [
    {
      title: "Total Users",
      value: "2,853",
      change: "+12%",
      icon: Users,
      description: "from last month",
    },
    {
      title: "Active Clients",
      value: "42",
      change: "+3",
      icon: Building2,
      description: "from last month",
    },
    {
      title: "Total Products",
      value: "87",
      change: "+5",
      icon: BookOpen,
      description: "from last month",
    },
    {
      title: "Completion Rate",
      value: "78%",
      change: "+2.5%",
      icon: GraduationCap,
      description: "from last month",
    },
  ]

  return (
    <>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{stat.change}</span> {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
