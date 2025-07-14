import Link from 'next/link';
import Image from 'next/image';
import { HomePageClient } from '@/components/app/HomePageClient';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthAwareNavButtons } from '@/components/navigation/auth-aware-nav-buttons';

export default function HomePage() {
  return (
    <main>
        {/* Responsive Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          {/* Logo - responsive sizing with proper aspect ratio */}
          <div className="flex-shrink-0">
            <Image 
              src="/Cultus-white (1).png"
              alt="Cultus Logo" 
              width={120}
              height={60}
              priority
              className="dark:opacity-100 opacity-80 w-20 h-10 sm:w-24 sm:h-12 md:w-32 md:h-16 lg:w-36 lg:h-18 object-contain"
            />
          </div>
          
          {/* Navigation buttons - responsive gap and sizing */}
          <div className="flex gap-2 sm:gap-3 md:gap-4 items-center">
            <ThemeToggle />
            <AuthAwareNavButtons />
          </div>
        </div>
      </div>

      <HomePageClient title="Cultus Learning" />
    </main>
  );
}
