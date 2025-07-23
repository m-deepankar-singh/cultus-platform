import { AppLoginForm } from "@/components/auth/app-login-form";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { StaticBackground } from "@/components/ui/static-background";

export default function AppLoginPage() {
	return (
		<div className="relative min-h-screen flex items-center justify-center w-full overflow-hidden">
			{/* Responsive Logo overlay */}
			<div className="absolute top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-20">
				<Link href="/">
					<Image 
						src="/Cultus-white (1).png"
						alt="Cultus Logo" 
						width={120}
						height={60}
						priority
						className="dark:opacity-100 opacity-80 w-20 h-10 sm:w-24 sm:h-12 md:w-32 md:h-16 lg:w-36 lg:h-18 object-contain"
					/>
				</Link>
			</div>

			{/* Static background */}
			<div className="absolute inset-0 -z-10">
				<StaticBackground title="" />
			</div>

			{/* Responsive Login card with glassmorphism effect */}
			<Card className="w-full max-w-sm sm:max-w-md mx-3 sm:mx-4 lg:mx-auto z-10 bg-white/60 dark:bg-black/60 backdrop-blur-lg border border-white/20 dark:border-neutral-800/30 shadow-xl">
				<CardContent className="pt-5 pb-5 px-3 sm:pt-6 sm:pb-6 sm:px-4 lg:pt-8 lg:px-6">
					<AppLoginForm />
				</CardContent>
			</Card>
		</div>
	);
} 