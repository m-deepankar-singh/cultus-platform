"use client";

import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card";
import { AdaptiveParticles } from "@/components/ui/floating-particles";

export default function TermsConditionsPage() {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Terms and Conditions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully
          </p>
        </div>

        <PerformantAnimatedCard variant="glass" className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <h2>Acceptance of Terms</h2>
              <p>
                By accessing and using the Cultus Platform, you accept and agree to be bound by the 
                terms and provision of this agreement.
              </p>

              <h2>Use License</h2>
              <p>
                Permission is granted to temporarily access the materials on Cultus Platform for 
                personal, non-commercial transitory viewing only. This is the grant of a license, 
                not a transfer of title.
              </p>

              <h2>User Account</h2>
              <p>
                You are responsible for safeguarding the password and for maintaining the 
                confidentiality of your account. You agree not to disclose your password to any third party.
              </p>

              <h2>Prohibited Uses</h2>
              <p>
                You may not use our platform for any unlawful purpose or to solicit others to perform 
                or participate in any unlawful acts.
              </p>

              <h2>Disclaimer</h2>
              <p>
                The information on this platform is provided on an 'as is' basis. To the fullest 
                extent permitted by law, Cultus Platform excludes all representations, warranties, 
                conditions and terms.
              </p>

              <h2>Contact Information</h2>
              <p>
                If you have questions about these Terms and Conditions, please contact us at:{" "}
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