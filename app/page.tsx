import { redirect } from "next/navigation"
import DotGridAnimation from '@/components/DotGridAnimation';
import styles from './HomePage.module.css';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className={styles.body}>
      <div className={styles.container}>
        {/* Container for top-right navigation buttons */}
        <div className={styles.topRightButtons}>
          <Link href="/dashboard" passHref legacyBehavior>
            <a className={styles.navButton}>Admin</a>
          </Link>
          <Link href="/app/login" passHref legacyBehavior>
            <a className={styles.navButton}>Login</a>
          </Link>
        </div>

        {/* The DotGridAnimation component will handle the dot grid rendering and logic */}
        <DotGridAnimation />
        <div className={styles.contentContainer}>
          <div className={styles.logoContainer}>
            {/* Use Next.js Image component for optimization */}
            <Image 
              src="/Cultus-white (1).png" // Assumes image is in public directory
              alt="Cultus Logo" 
              width={400} // Provide approximate width 
              height={200} // Provide approximate height
              className={styles.centerLogo}
              priority // Prioritize loading the logo
            />
          </div>
          <div className={styles.buttonContainer}>
            <button className={styles.ctaButton}>
              Start learning
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
