"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Data Science",
    courses: 85,
    assessments: 78,
  },
  {
    name: "Web Dev",
    courses: 72,
    assessments: 65,
  },
  {
    name: "UX Design",
    courses: 90,
    assessments: 82,
  },
  {
    name: "Cloud",
    courses: 68,
    assessments: 60,
  },
  {
    name: "Mobile",
    courses: 75,
    assessments: 70,
  },
]

export function CompletionRates() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip />
        <Bar dataKey="courses" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Courses" />
        <Bar dataKey="assessments" fill="#10b981" radius={[4, 4, 0, 0]} name="Assessments" />
      </BarChart>
    </ResponsiveContainer>
  )
}
