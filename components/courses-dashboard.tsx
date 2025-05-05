"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Clock } from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for courses
const courses = [
  {
    id: "1",
    title: "Advanced Python Projects: Build AI Applications",
    instructor: "Priya Mohan",
    duration: "1h 47m",
    progress: 0,
    status: "Not Started",
    image: "/placeholder.svg?height=200&width=400",
    popular: true,
    modules: 8,
  },
  {
    id: "2",
    title: "Build Your Own GPTs",
    instructor: "Alina Zhang",
    duration: "46m",
    progress: 25,
    status: "In Progress",
    image: "/placeholder.svg?height=200&width=400",
    popular: true,
    modules: 5,
  },
  {
    id: "3",
    title: "Building a Project with the ChatGPT API",
    instructor: "Kesha Williams",
    duration: "1h 56m",
    progress: 75,
    status: "In Progress",
    image: "/placeholder.svg?height=200&width=400",
    popular: true,
    modules: 10,
  },
  {
    id: "4",
    title: "Automating Your Work with Custom GPTs",
    instructor: "Garrick Chow",
    duration: "31m",
    progress: 100,
    status: "Completed",
    score: "95%",
    image: "/placeholder.svg?height=200&width=400",
    popular: false,
    new: true,
    modules: 4,
  },
]

// Mock data for skills
const skills = [
  { id: 1, name: "Python Programming", category: "Development" },
  { id: 2, name: "AI & Machine Learning", category: "Data Science" },
  { id: 3, name: "Web Development", category: "Development" },
  { id: 4, name: "Data Analysis", category: "Data Science" },
  { id: 5, name: "UX Design", category: "Design" },
  { id: 6, name: "Project Management", category: "Business" },
]

export function CoursesDashboard() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container py-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Top picks for you</h1>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Courses</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="not-started">Not Started</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <Link href={`/course/${course.id}`} key={course.id}>
                    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-48 w-full">
                        <Image
                          src={course.image || "/placeholder.svg"}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 left-2 flex gap-2">
                          {course.popular && <Badge variant="secondary">Popular</Badge>}
                          {course.new && <Badge variant="default">New</Badge>}
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                            <Clock className="mr-1 h-3 w-3" />
                            {course.duration}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription>By: {course.instructor}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {course.status}
                            {course.status === "Completed" && course.score && ` • Score: ${course.score}`}
                          </span>
                          <span className="text-sm font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <div className="text-sm text-muted-foreground">{course.modules} modules</div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="in-progress" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses
                  .filter((course) => course.status === "In Progress")
                  .map((course) => (
                    <Link href={`/course/${course.id}`} key={course.id}>
                      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 w-full">
                          <Image
                            src={course.image || "/placeholder.svg"}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-2">
                            {course.popular && <Badge variant="secondary">Popular</Badge>}
                            {course.new && <Badge variant="default">New</Badge>}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                              <Clock className="mr-1 h-3 w-3" />
                              {course.duration}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                          <CardDescription>By: {course.instructor}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{course.status}</span>
                            <span className="text-sm font-medium">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <div className="text-sm text-muted-foreground">{course.modules} modules</div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses
                  .filter((course) => course.status === "Completed")
                  .map((course) => (
                    <Link href={`/course/${course.id}`} key={course.id}>
                      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 w-full">
                          <Image
                            src={course.image || "/placeholder.svg"}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-2">
                            {course.popular && <Badge variant="secondary">Popular</Badge>}
                            {course.new && <Badge variant="default">New</Badge>}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                              <Clock className="mr-1 h-3 w-3" />
                              {course.duration}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                          <CardDescription>By: {course.instructor}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              {course.status} • Score: {course.score}
                            </span>
                            <span className="text-sm font-medium">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <div className="text-sm text-muted-foreground">{course.modules} modules</div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
            <TabsContent value="not-started" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses
                  .filter((course) => course.status === "Not Started")
                  .map((course) => (
                    <Link href={`/course/${course.id}`} key={course.id}>
                      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 w-full">
                          <Image
                            src={course.image || "/placeholder.svg"}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-2">
                            {course.popular && <Badge variant="secondary">Popular</Badge>}
                            {course.new && <Badge variant="default">New</Badge>}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                              <Clock className="mr-1 h-3 w-3" />
                              {course.duration}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                          <CardDescription>By: {course.instructor}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">{course.status}</span>
                            <span className="text-sm font-medium">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <div className="text-sm text-muted-foreground">{course.modules} modules</div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-12">
            <div className="bg-muted/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Identify the skills you need to advance your learning</h2>
              <p className="text-muted-foreground mb-6">Search for the most popular skills for your career path</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {skills.map((skill) => (
                  <Card key={skill.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      <CardDescription>{skill.category}</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" className="w-full">
                        Explore
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
