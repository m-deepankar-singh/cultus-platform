"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Clock, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Target } from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { gsap } from "gsap"
import { cn } from "@/lib/utils"

// Define interfaces for the data structure from /api/app/progress
// These should match the structures returned by your API
interface ModuleProgress {
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number;
  score?: number | null;
  completed_at?: string | null;
  assessment_details?: {
    score?: number | null;
    submitted_at?: string | null;
    passed?: boolean | null;
  } | null;
}

interface Module {
  id: string;
  name: string;
  type: 'Course' | 'Assessment';
  sequence: number;
  // These come from joining with progress tables
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number;
  completed_at?: string | null;
  assessment_score?: number | null;
  assessment_submitted_at?: string | null;
  // Add other module-specific fields if necessary, e.g., description, image_url
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  // Calculated in the API or here
  product_progress_percentage: number; 
  product_status: 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed';
  image_url?: string | null; // Optional: if products have images
  modules: Module[];
  // Add other product-specific fields if necessary
}

// Mock data for courses (can be removed or kept for pure UI testing if products prop is undefined)
const mockCourses = [
  {
    id: "mock1",
    name: "Advanced Python Projects: Build AI Applications",
    instructor: "Priya Mohan", // This field is not in Product interface, adapt if needed
    duration: "1h 47m",    // This field is not in Product interface, adapt if needed
    product_progress_percentage: 0,
    product_status: "NotStarted" as 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed',
    image_url: "/placeholder.svg?height=200&width=400",
    popular: true, // This field is not in Product interface
    modules_count: 8, // This field is not in Product interface, can be modules.length
    modules: [],
  },
  // ... other mock courses
];

interface CoursesDashboardProps {
  products?: Product[];
  error?: string;
}

export function CoursesDashboard({ products: realProducts, error }: CoursesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const errorStateRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const productGridAnimatedRef = useRef<boolean>(false); // Ref to track if grid animation ran for current data

  // Determine which data to use: real data, or mock data as a fallback.
  // Prioritize real data if available and no error.
  const productsToDisplay = 
    !error && realProducts && realProducts.length > 0 
    ? realProducts 
    : (error ? [] : mockCourses.map(mc => ({...mc, modules: mc.modules || []} as Product)) ); // Fallback to mock if error or no real data
    // If error, productsToDisplay will be empty, and the error message will be shown.
    
  const filteredProducts = productsToDisplay.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Reset animation flag when the underlying data or error changes
  useEffect(() => {
     productGridAnimatedRef.current = false;
  }, [realProducts, error]);

  // Animation for error state
  useEffect(() => {
    if (error && errorStateRef.current) {
      gsap.fromTo(errorStateRef.current, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [error]);

  // Animation for empty state
  useEffect(() => {
    if (productsToDisplay.length === 0 && !error && emptyStateRef.current) {
      gsap.fromTo(emptyStateRef.current, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [productsToDisplay, error]);

  // Animation for product cards: Refined to run only once per data set
  useEffect(() => {
    // Only animate if data exists, no error, and animation hasn't run for this data set
    if (!error && filteredProducts.length > 0 && !productGridAnimatedRef.current) {
      gsap.fromTo(".product-card-item", 
        { opacity: 0, y: 20 }, 
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          ease: "power2.out", 
          stagger: 0.1, 
          overwrite: "auto"
        }
      );
      productGridAnimatedRef.current = true; // Mark animation as complete for this data set
    }
    // If filteredProducts becomes empty (e.g., search yields no results), reset the flag
    // Or reset based on the source `realProducts` change (handled by the separate useEffect above)
     if (filteredProducts.length === 0) {
         productGridAnimatedRef.current = false;
     }

  }, [filteredProducts, error]); // Still depends on these, but logic inside prevents re-animation

  if (error) {
    return (
      <div ref={errorStateRef} className="min-h-screen flex flex-col items-center justify-center text-center p-4 opacity-0">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Could not load dashboard data</h2>
        <p className="text-muted-foreground mb-4">We encountered an error while fetching your courses and progress.</p>
        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">Error details: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6">Try Again</Button>
      </div>
    );
  }
  
  if (productsToDisplay.length === 0 && !error) {
     return (
      <div ref={emptyStateRef} className="min-h-screen flex flex-col items-center justify-center text-center p-4 opacity-0">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Courses Found</h2>
        <p className="text-muted-foreground">It looks like you are not enrolled in any courses or assessments yet.</p>
        {/* Optional: Add a link to browse courses or contact support */}
      </div>
    );
  }

  // Helper function to determine overall status for a product based on its modules
  const getProductStatus = (product: Product): 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed' => {
    if (!product.modules || product.modules.length === 0) return 'NotStarted';
    
    const statuses = product.modules.map(m => m.status);
    const allNotStarted = statuses.every(s => s === 'NotStarted');
    const allCompleted = statuses.every(s => s === 'Completed');
    
    if (allNotStarted) return 'NotStarted';
    if (allCompleted) return 'Completed';
    if (statuses.some(s => s === 'InProgress') || (statuses.some(s => s === 'NotStarted') && statuses.some(s => s === 'Completed'))) {
        return 'InProgress'; // Or 'Mixed' if you prefer for combined statuses. For simplicity, using InProgress.
    }
    return 'Mixed'; // Fallback, should ideally be covered by above logic.
  };

  // Helper function to calculate overall progress for a product
  const getProductProgressPercentage = (product: Product): number => {
    if (!product.modules || product.modules.length === 0) return 0;
    const totalProgress = product.modules.reduce((sum, m) => sum + (m.progress_percentage || 0), 0);
    return Math.round(totalProgress / product.modules.length);
  };

  // --- Functions for Expand/Collapse and Module Links ---
  const toggleExpand = (productId: string) => {
    setExpandedCards(prev => {
        const newState = { ...prev };
        const isCurrentlyExpanded = !!newState[productId];
        newState[productId] = !isCurrentlyExpanded;

        // Animate based on the *new* state (!isCurrentlyExpanded)
        const targetElement = document.getElementById(`modules-list-${productId}`);
        const chevronElement = document.getElementById(`chevron-${productId}`);

        if (targetElement && chevronElement) {
            if (!isCurrentlyExpanded) { // If it WAS collapsed, now EXPANDING
                 // Use a short delay to ensure state update allows conditional rendering before measuring height?
                 // Or rely on the fact that the element *should* be in the DOM if state is managed correctly
                 // Let's try measuring immediately after state conceptually changes.
                 
                 // Reset height to auto *before* the fromTo animation starts
                 gsap.set(targetElement, { height: 'auto', opacity: 1 }); 
                 const autoHeight = gsap.getProperty(targetElement, "height");
                 gsap.fromTo(targetElement, 
                     { height: 0, opacity: 0 }, 
                     { height: autoHeight, opacity: 1, duration: 0.3, ease: 'power1.inOut', overwrite: true }
                 );
                 gsap.to(chevronElement, { rotation: 180, duration: 0.3, overwrite: true });

            } else { // If it WAS expanded, now COLLAPSING
                gsap.to(targetElement, { 
                    height: 0, 
                    opacity: 0, 
                    duration: 0.3, 
                    ease: 'power1.inOut', 
                    overwrite: true 
                    // No onComplete needed if state is set immediately
                });
                gsap.to(chevronElement, { rotation: 0, duration: 0.3, overwrite: true });
            }
        }
        return newState; // Return the updated state object
    });
  };
  
  const getModuleLink = (module: Module): string => {
    if (module.type === 'Assessment') {
      return `/app/assessment/${module.id}/take`;
    } else {
      return `/app/course/${module.id}`;
    }
  };

  // --- Render Functions ---
  const renderModuleItem = (module: Module) => (
    // Wrap the entire list item content in a Link
    <li key={module.id}>
      <Link 
        href={getModuleLink(module)} 
        className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 group"
      >
        <div className="flex items-center gap-2 flex-grow min-w-0"> {/* Added flex-grow and min-w-0 */} 
          {module.type === 'Course' ? 
            <BookOpen className="h-4 w-4 text-blue-500 flex-shrink-0" /> : 
            <Target className="h-4 w-4 text-green-500 flex-shrink-0" />
          }
          <span className="text-sm font-medium text-gray-800 truncate">{module.name}</span> {/* Added truncate */} 
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2"> {/* Added flex-shrink-0 and ml-2 */} 
          <Badge variant={module.status === 'Completed' ? 'success' : module.status === 'InProgress' ? 'default' : 'outline'} className="text-xs whitespace-nowrap">
            {module.status.replace(/([A-Z])/g, ' $1').trim()}
          </Badge>
          {module.status === 'InProgress' && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">({module.progress_percentage}%)</span>
          )}
           {/* Removed explicit Button */}
        </div>
      </Link>
    </li>
  );

  const renderProductCard = (product: Product) => {
    const overallStatus = product.product_status || getProductStatus(product);
    const overallProgress = product.product_progress_percentage || getProductProgressPercentage(product);
    const isExpanded = !!expandedCards[product.id];

    return (
      <div key={product.id} className="product-card-item opacity-0">
        <Card className="h-full overflow-hidden transition-shadow duration-300 ease-in-out flex flex-col border shadow-sm hover:shadow-md">
          <Link href={`/app/product-details/${product.id}`} className="block relative h-48 w-full group">
            <Image
              src={product.image_url || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
            <CardTitle className="absolute bottom-2 left-4 text-lg text-white line-clamp-2 z-10 group-hover:underline">{product.name}</CardTitle>
          </Link>

          <CardContent className="p-4 pt-4 flex-grow">
            {product.description && <CardDescription className="text-sm line-clamp-2 mt-0 mb-3">{product.description}</CardDescription>}
            <div className="flex items-center justify-between mb-2">
              <Badge variant={
                  overallStatus === 'Completed' ? 'success' :
                  overallStatus === 'InProgress' ? 'default' :
                  overallStatus === 'NotStarted' ? 'outline' : 'secondary'
                }>{overallStatus.replace(/([A-Z])/g, ' $1').trim()}</Badge>
              <span className="text-sm font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </CardContent>

          {product.modules && product.modules.length > 0 && (
            <>
              <div 
                 className="px-4 py-3 border-t border-b cursor-pointer flex justify-between items-center bg-muted/50 hover:bg-muted transition-colors"
                 onClick={() => toggleExpand(product.id)} 
                 aria-expanded={isExpanded}
                 aria-controls={`modules-list-${product.id}`}
              >
                <span className="text-sm font-medium text-muted-foreground">Modules ({product.modules.length})</span>
                <ChevronDown id={`chevron-${product.id}`} className={cn("h-5 w-5 text-muted-foreground transition-transform", {"rotate-180": isExpanded})} />
              </div>
              <div 
                id={`modules-list-${product.id}`} 
                className="overflow-hidden bg-muted/20" 
                style={{ height: 0, opacity: 0 }} // Initial state for GSAP
              >
                 {/* Render modules only if expanded? No, GSAP needs the elements. */}
                <ul className="px-4 py-2 space-y-1"> {/* Reverted space-y back to 1 for potentially tighter list */}
                  {product.modules.sort((a, b) => a.sequence - b.sequence).map(renderModuleItem)}
                </ul>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container py-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Your Learning Dashboard</h1>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search your products..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="not-started">Not Started</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(renderProductCard)}
              </div>
            </TabsContent>

            <TabsContent value="in-progress" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "InProgress").map(renderProductCard)}
              </div>
              {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "InProgress").length === 0 && <div className="text-center py-10"><p className="text-muted-foreground">No products currently in progress.</p></div>}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "Completed").map(renderProductCard)}
              </div>
              {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "Completed").length === 0 && <div className="text-center py-10"><p className="text-muted-foreground">You haven't completed any products yet.</p></div>}
            </TabsContent>
            
            <TabsContent value="not-started" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "NotStarted").map(renderProductCard)}
              </div>
              {filteredProducts.filter(p => (p.product_status || getProductStatus(p)) === "NotStarted").length === 0 && <div className="text-center py-10"><p className="text-muted-foreground">No products found that haven't been started.</p></div>}
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  )
}
