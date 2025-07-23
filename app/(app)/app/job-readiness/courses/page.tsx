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
          <div className="text-center space-y-4 px-4">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 flex-wrap">
              <div className="p-2 sm:p-3 rounded-full bg-green-500/20 dark:bg-green-500/10 backdrop-blur-sm border border-green-500/20 flex-shrink-0">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Course Modules
              </h1>
              <div className="p-2 sm:p-3 rounded-full bg-blue-500/20 dark:bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 flex-shrink-0">
                <Play className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Learn through comprehensive video content and AI-generated quizzes. 
              Complete courses to advance your skills and earn your second star.
            </p>
          </div>

          {/* Course Information Card */}
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            className="dashboard-card border-green-500/20 bg-green-500/5 dark:bg-green-500/5 mx-4 sm:mx-0"
            staggerIndex={0}
          >
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-semibold text-green-900 dark:text-green-100">
                  About Course Modules
                </h3>
              </div>
              
              <p className="text-sm sm:text-base text-green-700 dark:text-green-300 leading-relaxed">
                Structured learning modules with video content and interactive quizzes to build your skills.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200 text-sm sm:text-base">Course Features:</h4>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span>High-quality video lessons</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span>AI-generated quizzes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span>Progress tracking</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span>Self-paced learning</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200 text-sm sm:text-base">What to Expect:</h4>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span>Interactive learning experience</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span>Tier-based difficulty</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span>Practical applications</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span>Immediate feedback</span>
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
 