import Link from 'next/link';
import { UploadDebugger } from '@/components/common/UploadDebugger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminR2TestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          R2 Storage Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test Cloudflare R2 upload functionality across different file types
        </p>
      </div>
      
      <Tabs defaultValue="debugger" className="w-full">
        <TabsList>
          <TabsTrigger value="debugger">Debug Upload Flow</TabsTrigger>
          <TabsTrigger value="demo">Upload Demo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="debugger" className="space-y-4">
          <UploadDebugger />
        </TabsContent>
        
        <TabsContent value="demo" className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Upload Demo Migrated
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The old R2 upload demo has been migrated to the new S3 system.
            </p>
            <Link 
              href="/test/s3-uploads" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to S3 Upload Test
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 