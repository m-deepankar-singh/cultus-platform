"use client";

import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter, Youtube, Linkedin, Mail, MapPin } from "lucide-react";
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card";

export function AppFooter() {
  return (
    <footer className="relative mt-auto flex-shrink-0">
      <PerformantAnimatedCard 
        variant="glass" 
        className="rounded-none border-0 border-t backdrop-blur-md bg-background/80"
      >
        <div className="container mx-auto px-4 py-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* Logo and Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Image
                  src="/Cultus-white (1).png"
                  alt="Cultus Platform"
                  width={120}
                  height={40}
                  className="h-8 w-auto filter dark:invert-0 invert"
                />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Empowering learners with AI-driven upskilling and job readiness programs.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Let's Connect!</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>PSP SQUARE, 4th Floor, No 201</p>
                    <p>Green Glen Layout, Bellandur ORR,</p>
                    <p>Bangalore- 560 103</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a 
                    href="mailto:sales@cultusedu.com" 
                    className="hover:text-primary transition-colors"
                  >
                    sales@cultusedu.com
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links and Social */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Quick Links</h3>
              
              <div className="flex flex-col space-y-2">
                <Link 
                  href="/app/privacy-policy" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link 
                  href="/app/terms-conditions" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms and Conditions
                </Link>
                <Link 
                  href="/app/support" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Support
                </Link>
              </div>

              {/* Social Media Icons */}
              <div className="flex space-x-4 pt-2">
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 mt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Copyright © 2025 Cultus
            </p>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">
              Powered by Cultus Education & Technology Services Pvt Ltd
            </p>
          </div>
        </div>
      </PerformantAnimatedCard>
    </footer>
  );
}