"use client";

import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card";
import { AdaptiveParticles } from "@/components/ui/floating-particles";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Support Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're here to help you succeed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Contact Methods */}
          <PerformantAnimatedCard variant="glass" staggerIndex={0}>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-center">Get in Touch</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Support</p>
                    <a 
                      href="mailto:support@cultusedu.com" 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      support@cultusedu.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Live Chat</p>
                    <p className="text-sm text-muted-foreground">
                      Available 9 AM - 6 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Office Address</p>
                    <div className="text-sm text-muted-foreground">
                      <p>PSP SQUARE, 4th Floor, No 201</p>
                      <p>Green Glen Layout, Bellandur ORR</p>
                      <p>Bangalore- 560 103</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>

          {/* FAQ */}
          <PerformantAnimatedCard variant="glass" staggerIndex={1}>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-center">Common Questions</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">How do I reset my password?</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on "Forgot Password" on the login page and follow the instructions 
                    sent to your email.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">How do I track my progress?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your progress is automatically tracked and visible on your dashboard 
                    and within each course module.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Can I access courses offline?</h3>
                  <p className="text-sm text-muted-foreground">
                    Currently, our platform requires an internet connection to access 
                    course materials and track progress.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">How do I contact my instructor?</h3>
                  <p className="text-sm text-muted-foreground">
                    You can reach out through the course discussion forum or use the 
                    messaging feature within each course.
                  </p>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>
        </div>

        {/* Contact Form */}
        <PerformantAnimatedCard variant="glass" className="max-w-2xl mx-auto" staggerIndex={2}>
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Send us a Message</h2>
            
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Can't find what you're looking for? Send us an email and we'll get back to you within 24 hours.
              </p>
              
              <AnimatedButton className="bg-gradient-to-r from-primary to-accent">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </AnimatedButton>
            </div>
          </div>
        </PerformantAnimatedCard>
      </div>
    </div>
  );
}