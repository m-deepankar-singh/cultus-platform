"use client";

import { useEffect, useState } from 'react';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { CourseList } from '@/components/job-readiness/CourseList';
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card';
import { AdaptiveParticles } from '@/components/ui/floating-particles';
import { BookOpen, Play } from 'lucide-react';
import gsap from 'gsap';

export default function CoursesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // GSAP animations for page elements
    if (mounted) {
      gsap.fromTo(
        ".dashboard-card",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      );
    }
  }, [mounted]);

  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <AdaptiveParticles />
      
      <JobReadinessLayout>
        <div className="relative space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-green-500/20 dark:bg-green-500/10 backdrop-blur-sm border border-green-500/20">
                <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Course Modules
              </h1>
              <div className="p-3 rounded-full bg-blue-500/20 dark:bg-blue-500/10 backdrop-blur-sm border border-blue-500/20">
                <Play className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Learn through comprehensive video content and AI-generated quizzes. 
              Complete courses to advance your skills and earn your second star.
            </p>
          </div>

          {/* Course Information Card */}
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            className="dashboard-card border-green-500/20 bg-green-500/5 dark:bg-green-500/5"
            staggerIndex={0}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                  About Course Modules
                </h3>
              </div>
              
              <p className="text-green-700 dark:text-green-300">
                Structured learning modules with video content and interactive quizzes to build your skills.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">Course Features:</h4>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      High-quality video lessons
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      AI-generated quizzes
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Progress tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Self-paced learning
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">What to Expect:</h4>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Interactive learning experience
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Tier-based difficulty
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Practical applications
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Immediate feedback
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>

          {/* Course List */}
          <CourseList />
        </div>
      </JobReadinessLayout>
    </div>
  );
} 
 