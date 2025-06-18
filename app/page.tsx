import Link from 'next/link';
import Image from 'next/image';
import { HomePageClient } from '@/components/app/HomePageClient';

export default function HomePage() {
  return (
    <main>
        {/* Container for top-right navigation buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-4">
        <Link href="/admin/login" passHref>
          <span className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-md text-black dark:text-white font-medium transition-all duration-200">
            Admin
          </span>
          </Link>
        <Link href="/app/login" passHref>
          <span className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-md text-black dark:text-white font-medium transition-all duration-200">
            Login
          </span>
          </Link>
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
