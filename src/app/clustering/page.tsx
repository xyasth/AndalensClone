// app/clustering/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  Database, 
  Users, 
  Image as ImageIcon, 
  RefreshCw, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface ClusteringStats {
  totalFaces: number;
  totalClusters: number;
  processedPhotos: number;
  pendingPhotos: number;
  averageConfidence: number;
  lastProcessed: Date | null;
}

interface ClusteringJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  eventId: string;
  eventName: string;
  photoCount: number;
  processedCount: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export default function ClusteringPage() {
  const [stats, setStats] = useState<ClusteringStats | null>(null);
  const [jobs, setJobs] = useState<ClusteringJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchClusteringData();
    
    // Poll for updates every 5 seconds when processing
    const interval = setInterval(() => {
      if (isProcessing) {
        fetchClusteringData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const fetchClusteringData = async () => {
    try {
      // In real implementation:
      // const [statsRes, jobsRes] = await Promise.all([
      //   fetch('/api/clustering/stats'),
      //   fetch('/api/clustering/jobs')
      // ]);
      
      // Dummy data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats({
        totalFaces: 1247,
        totalClusters: 156,
        processedPhotos: 423,
        pendingPhotos: 12,
        averageConfidence: 0.89,
        lastProcessed: new Date(Date.now() - 3600000) // 1 hour ago
      });
      
      setJobs([
        {
          id: 'job-1',
          status: 'completed',
          eventId: 'event-1',
          eventName: 'Birthday Party 2024',
          photoCount: 45,
          processedCount: 45,
          startedAt: new Date(Date.now() - 7200000),
          completedAt: new Date(Date.now() - 3600000)
        },
        {
          id: 'job-2',
          status: 'processing',
          eventId: 'event-2',
          eventName: 'Wedding Reception',
          photoCount: 120,
          processedCount: 87,
          startedAt: new Date(Date.now() - 1800000)
        },
        {
          id: 'job-3',
          status: 'pending',
          eventId: 'event-3',
          eventName: 'Company Retreat',
          photoCount: 80,
          processedCount: 0,
          startedAt: new Date()
        }
      ]);
      
      setIsProcessing(jobs.some(job => job.status === 'processing'));
    } catch (error) {
      console.error('Failed to fetch clustering data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startClustering = async (eventId?: string) => {
    try {
      setIsProcessing(true);
      // In real implementation:
      // await fetch('/api/clustering/start', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ eventId })
      // });
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchClusteringData();
    } catch (error) {
      console.error('Failed to start clustering:', error);
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Brain className="w-8 h-8 mr-3 text-blue-600" />
                AI Clustering Management
              </h1>
              <p className="text-gray-600 mt-1">Monitor and manage face clustering operations</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startClustering()}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Start Clustering'}
              </button>
              <button
                onClick={fetchClusteringData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Faces</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalFaces?.toLocaleString() ?? '0'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clusters</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalClusters ?? 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.processedPhotos ?? 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingPhotos ?? 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Confidence</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.averageConfidence ? (stats.averageConfidence * 100).toFixed(0) : '0'}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ChromaDB Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                ChromaDB Status
              </h3>
              <p className="text-sm text-gray-600 mt-1">Vector database for face embeddings</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
              <Link
                href="/clustering/chromadb"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Manage Database →
              </Link>
            </div>
          </div>
        </div>

        {/* Processing Jobs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Processing Jobs</h3>
            <p className="text-sm text-gray-600 mt-1">Current and recent clustering operations</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {jobs.length === 0 ? (
              <div className="p-6 text-center">
                <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No clustering jobs yet</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(job.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">{job.eventName}</h4>
                        <p className="text-sm text-gray-600">
                          {job.processedCount}/{job.photoCount} photos processed
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                      
                      {job.status === 'processing' && (
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(job.processedCount / job.photoCount) * 100}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <div className="text-right text-sm text-gray-600">
                        <p>Started: {job.startedAt.toLocaleTimeString()}</p>
                        {job.completedAt && (
                          <p>Completed: {job.completedAt.toLocaleTimeString()}</p>
                        )}
                      </div>
                      
                      <Link
                        href={`/events/${job.eventId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Event →
                      </Link>
                    </div>
                  </div>
                  
                  {job.error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 mr-2" />
                        <p className="text-sm text-red-700">{job.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Endpoints */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-600" />
              API Integration Points
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Quality Check:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">POST /api/photos/quality-check</code>
              </div>
              <div>
                <span className="font-medium text-gray-700">Face Detection:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">POST /api/clustering/detect-faces</code>
              </div>
              <div>
                <span className="font-medium text-gray-700">Face Clustering:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">POST /api/clustering/cluster-faces</code>
              </div>
              <div>
                <span className="font-medium text-gray-700">ChromaDB Query:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">POST /api/chromadb/query</code>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-600" />
              Clustering Configuration
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Face Confidence Threshold:</span>
                <span className="font-medium">80%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Clustering Similarity:</span>
                <span className="font-medium">75%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Max Photos per Batch:</span>
                <span className="font-medium">100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Quality Score Minimum:</span>
                <span className="font-medium">60%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {stats?.lastProcessed && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                Last clustering operation completed {' '}
                {Math.round((Date.now() - stats.lastProcessed.getTime()) / (1000 * 60))} minutes ago
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}