'use client';

import Link from 'next/link';
import { 
  Upload, 
  Brain, 
  Users, 
  Image as ImageIcon,
  Database,
  Zap,
  CheckCircle
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Upload,
      title: 'Smart Upload',
      description: 'Upload up to 100 photos at once with automatic quality checking'
    },
    {
      icon: Brain,
      title: 'AI Face Detection',
      description: 'Advanced ML models detect and analyze faces in your photos'
    },
    {
      icon: Users,
      title: 'Face Clustering',
      description: 'Automatically group photos by the people in them'
    },
    {
      icon: Database,
      title: 'ChromaDB Integration',
      description: 'Vector database for efficient similarity search and clustering'
    }
  ];

  const workflow = [
    {
      step: 1,
      title: 'Create Event',
      description: 'Start by creating an event or selecting an existing one'
    },
    {
      step: 2,
      title: 'Upload Photos',
      description: 'Upload your photos (max 100 per batch) to the event'
    },
    {
      step: 3,
      title: 'AI Processing',
      description: 'Our AI checks quality, detects faces, and clusters them'
    },
    {
      step: 4,
      title: 'Browse Gallery',
      description: 'View photos organized by people and events automatically'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              AI-Powered Photo Clustering
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Automatically organize your photos by events and people using advanced face recognition 
              and clustering technology. Upload photos and let AI do the rest.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/upload"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                <Upload className="w-5 h-5 mr-2" />
                Start Uploading
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-medium"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Browse Gallery
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built with cutting-edge AI and modern technology stack for reliable photo organization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Simple 4-step process to organize your photos automatically
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {workflow.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to organize your photos?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Start by creating your first event and uploading photos. 
            Our AI will handle the rest automatically.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Zap className="w-5 h-5 mr-2" />
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}
