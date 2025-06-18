"use client";

import dynamic from 'next/dynamic';

// Dynamically import the heavy BackgroundPaths component
const DynamicBackgroundPaths = dynamic(
  () => import('@/components/ui/background-paths').then(mod => ({ default: mod.BackgroundPaths })),
  { 
    ssr: false, 
    loading: () => (
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950">
        <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-700/80 dark:from-white dark:to-white/80">
              Cultus Learning
            </h1>
            <div className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 dark:from-white/10 dark:to-black/10 p-px rounded-xl backdrop-blur-lg overflow-hidden shadow-lg">
              <div className="rounded-xl px-6 py-4 text-base font-medium backdrop-blur-md bg-white/95 dark:bg-black/95 text-black dark:text-white border border-black/10 dark:border-white/10">
                <span className="opacity-90">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
);

interface HomePageClientProps {
  title?: string;
}

export function HomePageClient({ title = "Cultus Learning" }: HomePageClientProps) {
  return <DynamicBackgroundPaths title={title} />;
} 