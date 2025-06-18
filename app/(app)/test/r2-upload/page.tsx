import Link from 'next/link';

export default function R2UploadTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Upload Test Migrated
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The old R2 upload test has been migrated to the new S3 system.
        </p>
        <Link 
          href="/test/s3-uploads" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to S3 Upload Test
        </Link>
      </div>
    </div>
  );
} 