"use client"

import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from 'next/navigation';

// Function to generate trend data for the last 30 days at weekly intervals
const generateLast30DaysTrendData = () => {
  const data = [];
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  for (let i = 4; i >= 0; i--) { // 5 points: today, 7, 14, 21, 28 days ago
    const date = new Date(today);
    date.setDate(today.getDate() - (i * 7));
    data.push({
      name: dateFormatter.format(date),
      activeUsers: 1500 + Math.floor(Math.random() * 1000) - (i * 50), // Some variation
      fullDate: date.toISOString().split('T')[0] // YYYY-MM-DD for tooltip
    });
  }
  return data;
};



// Define props
interface UserEngagementProps {
  malCount?: number;
  malFilterApplied?: { year: number; month: number } | 'last30days';
  error?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Last 5 years
const months = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

export function UserEngagement({ malCount, malFilterApplied, error }: UserEngagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filter values from URL or set defaults
  const currentSelectedYear = searchParams.get('year') || 'all'; // Default to 'all' or current year
  const currentSelectedMonth = searchParams.get('month') || 'all'; // Default to 'all'

  const handleFilterChange = (type: 'year' | 'month', value: string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    if (value === 'all') {
      currentParams.delete(type);
    } else {
      currentParams.set(type, value);
    }

    // If one is set, ensure the other is also set or defaulted (e.g., to current month/year if needed)
    // For simplicity now, allow changing one - if year is 'all', month is ignored by backend
    // If month is 'all' but year is specific, backend ignores month.
    // If both are specific, backend uses both.
    // If both are 'all', backend uses default (last 30 days)
    
    // Ensure 'all' month is removed if year becomes specific?
    if (type === 'year' && value !== 'all' && currentParams.get('month') === 'all') {
       // Maybe default month to current month or 1? Or just let backend handle it.
       // Let's let backend handle the default case (last 30 days if month/year combo invalid/incomplete)
    }
    if (type === 'month' && value !== 'all' && currentParams.get('year') === 'all') {
       currentParams.set('year', currentYear.toString()); // Default to current year if month is picked
    }

     // If year is set to 'all', remove month parameter too
    if (type === 'year' && value === 'all') {
      currentParams.delete('month');
    }

    router.push(`?${currentParams.toString()}`);
  };
  
  // Determine the title based on the filter applied
  let title = "Monthly Active Learners (Last 30 Days)";
  if (typeof malFilterApplied === 'object' && malFilterApplied.year && malFilterApplied.month) {
      const monthName = months.find(m => m.value === malFilterApplied.month)?.label || '';
      title = `Monthly Active Learners (${monthName} ${malFilterApplied.year})`;
  }

  let trendData;
  if (typeof malFilterApplied === 'object' && malFilterApplied.year && malFilterApplied.month) {
    const year = malFilterApplied.year;
    const month = malFilterApplied.month; // 1-indexed
    const daysInMonth = new Date(year, month, 0).getDate();
    trendData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        name: day.toString(), // X-axis label will be the day number
        activeUsers: 1500 + Math.floor(Math.random() * 500) + (i * Math.floor(Math.random() * 20 - 10)), // some variation
        fullDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` // For tooltip
      };
    });
  } else {
    trendData = generateLast30DaysTrendData();
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const displayLabel = data.fullDate ? data.fullDate : label;
      return (
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-lg p-2">
          <p className="text-sm font-bold text-foreground">{displayLabel}</p>
          <p className="text-sm text-primary">{`Active Users (Dummy): ${data.activeUsers}`}</p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return <div className="text-red-500 p-4">Error loading user engagement data: {error}</div>;
  }

  // Note: The chart uses dummy data. Only the MAL count is live.
  return (
    <div className="flex flex-col h-[350px]">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
           <h3 className="text-lg font-semibold">{title}</h3>
            {/* Filter Dropdowns */}
           <div className="flex space-x-2">
              <Select 
                value={currentSelectedMonth}
                onValueChange={(value) => handleFilterChange('month', value)}
              >
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select 
                 value={currentSelectedYear}
                 onValueChange={(value) => handleFilterChange('year', value)}
               >
                 <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Years</SelectItem>
                   {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                 </SelectContent>
               </Select>
           </div>
        </div>
        <p className="text-3xl font-bold">{malCount === undefined ? 'Loading...' : malCount}</p>
      </div>
      <div className="text-xs text-muted-foreground p-1 text-center flex-shrink-0">
        *Trend chart shows illustrative dummy data.
      </div>
      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
            <Tooltip 
              content={<CustomTooltip />}
            />
            <Line type="monotone" dataKey="activeUsers" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6 }} name="Active Users (Dummy)" /> 
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
