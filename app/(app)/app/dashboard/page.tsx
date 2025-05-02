import Link from "next/link";

export default function AppDashboardPage() {
	return (
		<div className="p-4 md:p-8">
			<h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
			<p className="text-muted-foreground mb-6">
				Welcome! Here you will find your assigned courses and assessments.
			</p>
			{/* Placeholder Content */}
			<div className="border rounded-lg p-6 bg-card">
				<h2 className="text-xl font-semibold mb-3">My Learning</h2>
				<p>Product and module list will appear here.</p>
				{/* Example link (replace later) */}
				<div className="mt-4">
					<Link href="#" className="text-primary hover:underline">
						View Sample Course
					</Link>
				</div>
			</div>
		</div>
	);
} 