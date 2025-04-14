"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  {
    name: "Jan",
    users: 2500,
    completions: 1800,
  },
  {
    name: "Feb",
    users: 3000,
    completions: 2100,
  },
  {
    name: "Mar",
    users: 2800,
    completions: 2000,
  },
  {
    name: "Apr",
    users: 3300,
    completions: 2400,
  },
  {
    name: "May",
    users: 3900,
    completions: 2900,
  },
  {
    name: "Jun",
    users: 3700,
    completions: 2800,
  },
  {
    name: "Jul",
    users: 4000,
    completions: 3100,
  },
  {
    name: "Aug",
    users: 4200,
    completions: 3300,
  },
  {
    name: "Sep",
    users: 4500,
    completions: 3600,
  },
  {
    name: "Oct",
    users: 4700,
    completions: 3800,
  },
  {
    name: "Nov",
    users: 4900,
    completions: 4000,
  },
  {
    name: "Dec",
    users: 5100,
    completions: 4200,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Line type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
