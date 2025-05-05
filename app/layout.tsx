import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/sidebar-provider"
import { Toaster } from "@/components/ui/toaster"
import { QueryProvider } from "@/components/providers/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Upskilling Platform",
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
          <SidebarProvider>
            {children}
            <Toaster />
          </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'