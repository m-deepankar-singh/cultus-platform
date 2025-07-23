"use client";

import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card";
import { AdaptiveParticles } from "@/components/ui/floating-particles";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy is important to us
          </p>
        </div>

        <PerformantAnimatedCard variant="glass" className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <h2>Information Collection and Use</h2>
              <p>
                At Cultus Platform, we collect information to provide better services to our users. 
                This includes information you provide when registering for an account, participating in courses, 
                or contacting our support team.
              </p>

              <h2>Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction.
              </p>

              <h2>Information Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy.
              </p>

              <h2>Contact Information</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:{" "}
                <a href="mailto:support@cultusedu.com" className="text-primary hover:underline">
                  support@cultusedu.com
                </a>
              </p>

              <p className="text-sm text-muted-foreground mt-8">
                Last updated: January 2025
              </p>
            </div>
          </div>
        </PerformantAnimatedCard>
      </div>
    </div>
  );
}