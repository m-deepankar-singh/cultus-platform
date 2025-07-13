import Link from 'next/link';
import Image from 'next/image';
import { HomePageClient } from '@/components/app/HomePageClient';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthAwareNavButtons } from '@/components/navigation/auth-aware-nav-buttons';

export default function HomePage() {
  return (
    <main>
        {/* Container for top-right navigation buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-4 items-center">
        <ThemeToggle />
        <AuthAwareNavButtons />
      </div>

      {/* Logo overlay */}
      <div className="absolute top-8 left-8 z-20">
            <Image 
          src="/Cultus-white (1).png"
              alt="Cultus Logo" 
          width={150}
          height={75}
          priority
          className="dark:opacity-100 opacity-80"
        />
      </div>

      <HomePageClient title="Cultus Learning" />
    </main>
  );
}
