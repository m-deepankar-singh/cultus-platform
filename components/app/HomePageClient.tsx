"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useRef, useEffect, useState } from 'react';
import { createClient } from "@/lib/supabase/client";
import gsap from 'gsap';
import { CanvasRevealEffect } from '@/components/ui/canvas-background';

interface HomePageClientProps {
  title?: string;
}

export function HomePageClient({ title = "Cultus Learning" }: HomePageClientProps) {
  const words = title.split(" ");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleStartLearningClick = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.98,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          // Route based on authentication status
          if (isAuthenticated) {
            router.push('/app/dashboard');
          } else {
            router.push('/app/login');
          }
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white dark:bg-black">
      {/* Canvas Background */}
      <div className="absolute inset-0 z-0">
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="bg-white dark:bg-black"
          colors={[
            [0, 0, 0],
            [255, 255, 255],
          ]}
          dotSize={6}
          reverse={false}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,1)_0%,_transparent_100%)] dark:bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent dark:from-black dark:to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tighter">
            {words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                className="inline-block mr-3 last:mr-0"
              >
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay:
                        wordIndex * 0.1 +
                        letterIndex * 0.03,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text 
                    bg-gradient-to-r from-neutral-900 to-neutral-700/80 dark:from-white dark:to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <div
            className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 dark:from-white/10 dark:to-black/10 
            p-px rounded-xl backdrop-blur-lg 
            overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <Button
              variant="ghost"
              onClick={handleStartLearningClick}
              className="rounded-xl px-6 py-4 text-base font-medium backdrop-blur-md 
              bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
              text-black dark:text-white transition-all duration-300 
              group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10
              hover:shadow-md dark:hover:shadow-neutral-800/50"
            >
              <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                Start Learning
              </span>
              <span
                className="ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 
                transition-all duration-300"
              >
                →
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 