import Link from 'next/link';
import { 
  Upload, 
  Brain, 
  Users, 
  Image as ImageIcon, 
  Zap, 
  Database,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Database className="w-16 h-16 text-blue-200" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              PhotoCluster AI
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Automatically organize your photos using advanced AI face recognition and clustering
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/upload"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Photos
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center px-8 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                View Events
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How PhotoCluster AI Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our advanced AI pipeline automatically processes and organizes your photos in seconds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Upload</h3>
              <p className="text-gray-600">
                Upload up to 100 photos to Cloudflare R2 cloud storage with organized folder structure
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Quality Check</h3>
              <p className="text-gray-600">
                AI analyzes each photo for quality, lighting, and clarity. Low-quality photos are automatically filtered out
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Face Detection</h3>
              <p className="text-gray-600">
                Advanced ML models detect and extract facial features from approved photos with confidence scores
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">4. AI Clustering</h3>
              <p className="text-gray-600">
                ChromaDB vector database clusters faces by similarity to automatically group photos by people
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Person-Based Organization
              </h3>
              <p className="text-gray-600">
                Automatically create folders for each person detected in your photos. Find all photos containing specific people instantly.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <Database className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ChromaDB Integration
              </h3>
              <p className="text-gray-600">
                Powered by ChromaDB vector database for efficient similarity search and face clustering with high accuracy.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <Brain className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time Monitoring
              </h3>
              <p className="text-gray-600">
                Track processing status in real-time with detailed activity feeds and comprehensive statistics dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Trusted by Photo Enthusiasts</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">1,247</div>
              <div className="text-gray-300">Faces Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">156</div>
              <div className="text-gray-300">People Clustered</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">423</div>
              <div className="text-gray-300">Photos Organized</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">89%</div>
              <div className="text-gray-300">Accuracy Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Organize Your Photos with AI?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get started today and let our AI automatically cluster your photos by people
          </p>
          <Link
            href="/events/create"
            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Create Your First Event
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}