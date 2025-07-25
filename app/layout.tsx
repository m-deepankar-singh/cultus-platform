import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/sidebar-provider"
import { Toaster } from "@/components/ui/toaster"
import { QueryProvider } from "@/components/providers/query-provider"
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider"
import { AuthProvider } from "@/providers/auth-provider"
const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Cultus Platform",
  description: "Platform for upskilling learners",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
              <SidebarProvider>
                <SessionTimeoutProvider>
                  {children}
                  <Toaster />
                </SessionTimeoutProvider>
              </SidebarProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}