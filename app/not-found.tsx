import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 rounded-lg shadow-md bg-white max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <Button asChild>
            <Link href="/">
              Return Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/recommendations">
              View Recommendations
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 