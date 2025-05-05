"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  FileText,
  MessageSquare,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react"
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

// Mock data for course content
const courseData = {
  id: "1",
  title: "Advanced Python Projects: Build AI Applications",
  instructor: "Priya Mohan",
  description: "Elevate your Python portfolio with advanced AI applications",
  sections: [
    {
      id: "section-1",
      title: "Introduction",
      modules: [
        {
          id: "module-1-1",
          title: "Elevate Your Python portfolio with advanced AI applications",
          duration: "53s",
          type: "video",
          completed: true,
        },
        {
          id: "module-1-2",
          title: "What should you know before taking this course",
          duration: "53s",
          type: "video",
          completed: true,
        },
        {
          id: "module-1-3",
          title: "Using GitHub Codespaces with this course",
          duration: "2m 50s",
          type: "video",
          completed: false,
        },
        {
          id: "module-1-4",
          title: "A refresher of object-oriented programming concepts",
          duration: "3m 55s",
          type: "video",
          completed: false,
        },
      ],
    },
    {
      id: "section-2",
      title: "1. NLP: Build a Chatbot with Sentiment Analyzer",
      modules: [
        {
          id: "module-2-1",
          title: "Processing user input",
          duration: "4m 18s",
          type: "video",
          completed: false,
        },
        {
          id: "module-2-2",
          title: "Analyzing sentiment",
          duration: "1m 37s",
          type: "video",
          completed: false,
        },
        {
          id: "module-2-3",
          title: "Displaying automated chatbot responses based on sentiment",
          duration: "2m 10s",
          type: "video",
          completed: false,
        },
        {
          id: "module-2-4",
          title: "Enhancing chatbot with advanced NLP techniques",
          duration: "3m 45s",
          type: "video",
          completed: false,
        },
        {
          id: "module-2-5",
          title: "Section Assessment",
          type: "assessment",
          completed: false,
        },
      ],
    },
    {
      id: "section-3",
      title: "2. Computer Vision: Object Detection System",
      modules: [
        {
          id: "module-3-1",
          title: "Setting up your environment",
          duration: "2m 30s",
          type: "video",
          completed: false,
        },
        {
          id: "module-3-2",
          title: "Understanding object detection algorithms",
          duration: "5m 15s",
          type: "video",
          completed: false,
        },
        {
          id: "module-3-3",
          title: "Implementing real-time detection",
          duration: "4m 20s",
          type: "video",
          completed: false,
        },
        {
          id: "module-3-4",
          title: "Section Assessment",
          type: "assessment",
          completed: false,
        },
      ],
    },
  ],
  currentModule: "module-1-3",
}

export function CourseView({ courseId }: { courseId: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([courseData.sections[0].id])
  const [activeModule, setActiveModule] = useState(courseData.currentModule)

  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Find current module data
  const currentModuleData = courseData.sections
    .flatMap((section) => section.modules)
    .find((module) => module.id === activeModule)

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  // Handle video playback
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // Handle video duration loaded
  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  // Handle video seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Format time (seconds to MM:SS)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  // Handle module selection
  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId)
    // In a real app, you would load the appropriate content here
  }

  // Handle next/previous module navigation
  const navigateModule = (direction: "next" | "prev") => {
    const allModules = courseData.sections.flatMap((section) => section.modules)
    const currentIndex = allModules.findIndex((module) => module.id === activeModule)

    if (direction === "next" && currentIndex < allModules.length - 1) {
      setActiveModule(allModules[currentIndex + 1].id)
    } else if (direction === "prev" && currentIndex > 0) {
      setActiveModule(allModules[currentIndex - 1].id)
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col">
        <MainNav />
        <div className="flex flex-1">
          <Sidebar variant="sidebar" collapsible="offcanvas">
            <SidebarHeader className="border-b p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Course Contents</h2>
                <SidebarTrigger />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <ScrollArea className="h-[calc(100vh-8rem)]">
                {courseData.sections.map((section) => (
                  <Collapsible
                    key={section.id}
                    open={expandedSections.includes(section.id)}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 font-medium">
                      <span>{section.title}</span>
                      {expandedSections.includes(section.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-4">
                        {section.modules.map((module) => (
                          <button
                            key={module.id}
                            className={`flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-muted/50 ${
                              activeModule === module.id ? "bg-muted font-medium" : ""
                            }`}
                            onClick={() => handleModuleSelect(module.id)}
                          >
                            {module.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 overflow-hidden">
                              <span className="block truncate">{module.title}</span>
                              {module.duration && (
                                <span className="text-xs text-muted-foreground">{module.duration}</span>
                              )}
                            </div>
                            {module.type === "assessment" && <Badge variant="outline">Quiz</Badge>}
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </ScrollArea>
            </SidebarContent>
          </Sidebar>

          <div className="flex-1 overflow-auto">
            <div className="container py-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-sm text-muted-foreground">{courseData.title}</div>
                </div>

                <div className="grid gap-6">
                  <div ref={videoContainerRef} className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full aspect-video"
                      poster="/placeholder.svg?height=720&width=1280"
                      onTimeUpdate={handleTimeUpdate}
                      onDurationChange={handleDurationChange}
                      onEnded={() => setIsPlaying(false)}
                    >
                      <source src="/placeholder.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>

                    {/* Video controls overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-medium truncate">{currentModuleData?.title}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={() => {
                            const closeBtn = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement
                            if (closeBtn) closeBtn.click()
                          }}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{formatTime(currentTime)}</span>
                          <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                          />
                          <span className="text-white text-sm">{formatTime(duration)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:bg-white/20"
                              onClick={() => navigateModule("prev")}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:bg-white/20"
                              onClick={togglePlay}
                            >
                              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white hover:bg-white/20"
                              onClick={() => navigateModule("next")}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>

                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20"
                                onClick={toggleMute}
                              >
                                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                              </Button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                              />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={toggleFullscreen}
                          >
                            <Maximize className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="overview">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="qa">Q&A</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-4">
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                          <h1 className="text-2xl font-bold">{courseData.title}</h1>
                          <p className="text-muted-foreground">{courseData.description}</p>

                          <div className="mt-6">
                            <h3 className="font-medium mb-2">What you'll learn</h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Build advanced AI applications with Python</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Implement natural language processing techniques</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Create computer vision applications</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Deploy machine learning models</span>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Course details</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Instructor</span>
                                <span>{courseData.instructor}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sections</span>
                                <span>{courseData.sections.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total modules</span>
                                <span>
                                  {courseData.sections.reduce((acc, section) => acc + section.modules.length, 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last updated</span>
                                <span>May 2023</span>
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Your progress</h3>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">25% complete</span>
                                  <span className="text-sm font-medium">3/12 modules</span>
                                </div>
                                <Progress value={25} className="h-2" />
                              </div>
                              <Button className="w-full" asChild>
                                <Link href={`/course/${courseId}/assessment`}>Take Assessment</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="qa" className="mt-4">
                      <div className="border rounded-lg p-6 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 font-medium">No questions yet</h3>
                        <p className="text-muted-foreground mt-1">Be the first to ask a question about this course</p>
                        <Button className="mt-4">Ask a Question</Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="notes" className="mt-4">
                      <div className="border rounded-lg p-6 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 font-medium">No notes yet</h3>
                        <p className="text-muted-foreground mt-1">Start taking notes to help with your learning</p>
                        <Button className="mt-4">Add Note</Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="transcript" className="mt-4">
                      <div className="border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">Transcript</h3>
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </div>
                        <div className="space-y-4 text-sm">
                          <div className="flex gap-4">
                            <span className="text-muted-foreground w-12">0:00</span>
                            <p>Hello and welcome to this course on Advanced Python Projects.</p>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-muted-foreground w-12">0:10</span>
                            <p>In this course, we'll be building several AI applications using Python.</p>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-muted-foreground w-12">0:18</span>
                            <p>
                              We'll start with natural language processing to build a chatbot with sentiment analysis.
                            </p>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-muted-foreground w-12">0:27</span>
                            <p>Then we'll move on to computer vision for object detection.</p>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-muted-foreground w-12">0:35</span>
                            <p>By the end of this course, you'll have a portfolio of advanced AI projects.</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
