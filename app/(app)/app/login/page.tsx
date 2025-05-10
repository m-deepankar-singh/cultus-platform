import { AppLoginForm } from "@/components/auth/app-login-form";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { StaticBackground } from "@/components/ui/static-background";

export default function AppLoginPage() {
	return (
		<div className="relative min-h-screen flex items-center justify-center w-full overflow-hidden">
			{/* Logo overlay */}
			<div className="absolute top-8 left-8 z-20">
				<Link href="/">
					<Image 
						src="/Cultus-white (1).png"
						alt="Cultus Logo" 
						width={150}
						height={75}
						priority
						className="dark:opacity-100 opacity-80"
					/>
				</Link>
			</div>

			{/* Static background */}
			<div className="absolute inset-0 -z-10">
				<StaticBackground title="" />
			</div>

			{/* Login card with glassmorphism effect */}
			<Card className="w-full max-w-md mx-auto z-10 bg-white/60 dark:bg-black/60 backdrop-blur-lg border border-white/20 dark:border-neutral-800/30 shadow-xl">
				<CardContent className="pt-8 pb-6 px-6">
					<AppLoginForm />
				</CardContent>
			</Card>
		</div>
	);
} 