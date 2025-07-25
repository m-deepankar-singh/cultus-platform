import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { StaticBackground } from "@/components/ui/static-background";
import { Suspense } from "react";

function AdminLoginFormFallback() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="text-center mb-6">
				<div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
				<div className="h-6 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
				<div className="h-4 bg-gray-300 rounded w-48 mx-auto"></div>
			</div>
			<div className="space-y-4">
				<div className="h-12 bg-gray-300 rounded"></div>
				<div className="h-12 bg-gray-300 rounded"></div>
				<div className="h-12 bg-gray-300 rounded"></div>
			</div>
		</div>
	);
}

export default function AdminLoginPage() {
	return (
		<div className="relative min-h-screen flex items-center justify-center w-full overflow-hidden">
			{/* Responsive Logo overlay */}
			<div className="absolute top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-20">
				<Link href="/">
					<Image 
						src="/Cultus-white (1).png"
						alt="Cultus Logo" 
						width={150}
						height={75}
						priority
						className="dark:opacity-100 opacity-80 w-16 h-8 sm:w-20 sm:h-10 md:w-24 md:h-12 lg:w-32 lg:h-16 xl:w-36 xl:h-18 object-contain"
					/>
				</Link>
			</div>

			{/* Static background */}
			<div className="absolute inset-0 -z-10">
				<StaticBackground title="" />
			</div>

			{/* Responsive Login card with glassmorphism effect */}
			<Card className="w-full max-w-md mx-4 sm:mx-auto z-10 bg-white/60 dark:bg-black/60 backdrop-blur-lg border border-white/20 dark:border-neutral-800/30 shadow-xl">
				<CardContent className="pt-6 pb-6 px-4 sm:pt-8 sm:px-6">
					<Suspense fallback={<AdminLoginFormFallback />}>
						<AdminLoginForm />
					</Suspense>
				</CardContent>
			</Card>
		</div>
	);
} 