// // app/clustering/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { 
//   Brain, 
//   Database, 
//   Activity, 
//   CheckCircle, 
//   AlertTriangle, 
//   Clock, 
//   RefreshCw,
//   TrendingUp,
//   Server,
//   Zap
// } from 'lucide-react';
// import { ProcessingActivity, Event } from '@/types';

// interface ChromaDBStats {
//   isHealthy: boolean;
//   collections: string[];
//   eventStats?: {
//     count: number;
//     clusters: string[];
//     avgConfidence: number;
//   };
// }

// export default function ClusteringMonitor() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [activities, setActivities] = useState<ProcessingActivity[]>([]);
//   const [events, setEvents] = useState<Event[]>([]);
//   const [chromaStats, setChromaStats] = useState<ChromaDBStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedEvent, setSelectedEvent] = useState<string>('');

//   if (status === "loading") {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   if (!session) {
//     router.push('/auth/signin');
//     return null;
//   }

//   useEffect(() => {
//     fetchData();
//     const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
//     return () => clearInterval(interval);
//   }, [selectedEvent]);

//   const fetchData = async () => {
//     try {
//       // Fetch processing activities
//       const activitiesResponse = await fetch('/api/processing-activities', {
//         headers: { 'Authorization': `Bearer ${(session as any).accessToken}` }
//       });
//       if (activitiesResponse.ok) {
//         const activitiesData = await activitiesResponse.json();
//         setActivities(activitiesData);
//       }

//       // Fetch events
//       const eventsResponse = await fetch('/api/events', {
//         headers: { 'Authorization': `Bearer ${(session as any).accessToken}` }
//       });
//       if (eventsResponse.ok) {
//         const eventsData = await eventsResponse.json();
//         setEvents(eventsData);
//       }

//       // Fetch ChromaDB status
//       const chromaUrl = selectedEvent 
//         ? `/api/chromadb/status?eventId=${selectedEvent}`
//         : '/api/chromadb/status';
      
//       const chromaResponse = await fetch(chromaUrl, {
//         headers: { 'Authorization': `Bearer ${(session as any).accessToken}` }
//       });
//       if (chromaResponse.ok) {
//         const chromaData = await chromaResponse.json();
//         setChromaStats(chromaData.data);
//       }

//     } catch (error) {
//       console.error('Failed to fetch monitoring data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'COMPLETED': return 'text-green-600 bg-green-100';
//       case 'FAILED': return 'text-red-600 bg-red-100';
//       case 'PROCESSING': return 'text-yellow-600 bg-yellow-100';
//       default: return 'text-gray-600 bg-gray-100';
//     }
//   };

//   const getTypeIcon = (type: string) => {
//     switch (type) {
//       case 'UPLOAD': return <Zap className="w-4 h-4" />;
//       case 'QUALITY_CHECK': return <CheckCircle className="w-4 h-4" />;
//       case 'FACE_DETECTION': return <Activity className="w-4 h-4" />;
//       case 'CLUSTERING': return <Brain className="w-4 h-4" />;
//       default: return <Clock className="w-4 h-4" />;
//     }
//   };

//   const recentActivities = activities.slice(0, 10);
//   const processingStats = {
//     total: activities.length,
//     completed: activities.filter(a => a.status === 'COMPLETED').length,
//     failed: activities.filter(a => a.status === 'FAILED').length,
//     processing: activities.filter(a => a.status === 'PROCESSING').length
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center">
//               <Brain className="w-8 h-8 text-purple-600 mr-3" />
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-900">AI Clustering Monitor</h1>
//                 <p className="text-gray-600 mt-1">Real-time processing status and ChromaDB analytics</p>
//               </div>
//             </div>
//             <div className="flex items-center space-x-3">
//               <select
//                 value={selectedEvent}
//                 onChange={(e) => setSelectedEvent(e.target.value)}
//                 className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">All Events</option>
//                 {events.map(event => (
//                   <option key={event.id} value={event.id}>
//                     {event.title} ({event.name})
//                   </option>
//                 ))}
//               </select>
//               <button
//                 onClick={fetchData}
//                 className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
//               >
//                 <RefreshCw className="w-4 h-4 mr-2" />
//                 Refresh
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Stats Overview */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white rounded-lg border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Total Processed</p>
//                 <p className="text-2xl font-bold text-gray-900">{processingStats.total}</p>
//               </div>
//               <Activity className="w-8 h-8 text-blue-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Successful</p>
//                 <p className="text-2xl font-bold text-green-600">{processingStats.completed}</p>
//               </div>
//               <CheckCircle className="w-8 h-8 text-green-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Processing</p>
//                 <p className="text-2xl font-bold text-yellow-600">{processingStats.processing}</p>
//               </div>
//               <Clock className="w-8 h-8 text-yellow-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Failed</p>
//                 <p className="text-2xl font-bold text-red-600">{processingStats.failed}</p>
//               </div>
//               <AlertTriangle className="w-8 h-8 text-red-600" />
//             </div>
//           </div>
//         </div>

//         {/* ChromaDB Status */}
//         {chromaStats && (
//           <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
//             <div className="flex items-center justify-between mb-6">
//               <div className="flex items-center">
//                 <Database className="w-6 h-6 text-purple-600 mr-2" />
//                 <h2 className="text-xl font-semibold text-gray-900">ChromaDB Status</h2>
//               </div>
//               <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
//                 chromaStats.isHealthy 
//                   ? 'bg-green-100 text-green-800' 
//                   : 'bg-red-100 text-red-800'
//               }`}>
//                 <div className={`w-2 h-2 rounded-full mr-2 ${
//                   chromaStats.isHealthy ? 'bg-green-500' : 'bg-red-500'
//                 }`}></div>
//                 {chromaStats.isHealthy ? 'Healthy' : 'Unhealthy'}
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="text-center">
//                 <Server className="w-8 h-8 text-purple-600 mx-auto mb-2" />
//                 <p className="text-sm text-gray-600">Collections</p>
//                 <p className="text-xl font-bold text-gray-900">{chromaStats.collections.length}</p>
//               </div>

//               {chromaStats.eventStats && (
//                 <>
//                   <div className="text-center">
//                     <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
//                     <p className="text-sm text-gray-600">Face Embeddings</p>
//                     <p className="text-xl font-bold text-gray-900">{chromaStats.eventStats.count}</p>
//                   </div>

//                   <div className="text-center">
//                     <Brain className="w-8 h-8 text-green-600 mx-auto mb-2" />
//                     <p className="text-sm text-gray-600">Avg Confidence</p>
//                     <p className="text-xl font-bold text-gray-900">
//                       {(chromaStats.eventStats.avgConfidence * 100).toFixed(1)}%
//                     </p>
//                   </div>
//                 </>
//               )}
//             </div>

//             {chromaStats.collections.length > 0 && (
//               <div className="mt-4 pt-4 border-t border-gray-200">
//                 <h3 className="text-sm font-medium text-gray-700 mb-2">Active Collections:</h3>
//                 <div className="flex flex-wrap gap-2">
//                   {chromaStats.collections.map(collection => (
//                     <span 
//                       key={collection}
//                       className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
//                     >
//                       {collection}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Recent Processing Activities */}
//         <div className="bg-white rounded-lg border border-gray-200 p-6">
//           <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Processing Activities</h2>
          
//           {recentActivities.length === 0 ? (
//             <div className="text-center py-8 text-gray-500">
//               <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
//               <p>No processing activities found.</p>
//               <Link 
//                 href="/upload" 
//                 className="text-blue-600 hover:text-blue-700 underline mt-2 inline-block"
//               >
//                 Upload photos to see activities
//               </Link>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {recentActivities.map((activity) => (
//                 <div 
//                   key={activity.id} 
//                   className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   <div className="flex items-center space-x-4">
//                     <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
//                       {getTypeIcon(activity.type)}
//                     </div>
//                     <div>
//                       <div className="flex items-center space-x-2">
//                         <p className="font-medium text-gray-900">{activity.photoName}</p>
//                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
//                           {activity.status}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-600">
//                         {activity.eventName} • {activity.type.replace('_', ' ')}
//                       </p>
//                       {activity.error && (
//                         <p className="text-sm text-red-600 mt-1">{activity.error}</p>
//                       )}
//                     </div>
//                   </div>
                  
//                   <div className="text-right">
//                     <p className="text-sm text-gray-500">
//                       {new Date(activity.timestamp).toLocaleTimeString()}
//                     </p>
//                     {activity.facesDetected !== undefined && activity.facesDetected !== null && activity.facesDetected > 0 && (
//                       <p className="text-xs text-blue-600">
//                         {activity.facesDetected} faces, {activity.clustersCreated} clusters
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Quick Actions */}
//         <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
//           <Link 
//             href="/upload"
//             className="bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition-colors text-center"
//           >
//             <Zap className="w-6 h-6 mx-auto mb-2" />
//             <h3 className="font-medium">Upload Photos</h3>
//             <p className="text-sm opacity-90">Process new photos with AI</p>
//           </Link>

//           <Link 
//             href="/dashboard"
//             className="bg-green-600 text-white rounded-lg p-4 hover:bg-green-700 transition-colors text-center"
//           >
//             <TrendingUp className="w-6 h-6 mx-auto mb-2" />
//             <h3 className="font-medium">View Albums</h3>
//             <p className="text-sm opacity-90">Browse organized galleries</p>
//           </Link>

//           <button
//             onClick={() => {
//               // Initialize ChromaDB for selected event
//               if (selectedEvent) {
//                 fetch('/api/chromadb/init', {
//                   method: 'POST',
//                   headers: { 
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${(session as any).accessToken}`
//                   },
//                   body: JSON.stringify({ eventId: selectedEvent })
//                 }).then(() => fetchData());
//               }
//             }}
//             disabled={!selectedEvent}
//             className="bg-purple-600 text-white rounded-lg p-4 hover:bg-purple-700 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             <Database className="w-6 h-6 mx-auto mb-2" />
//             <h3 className="font-medium">Init ChromaDB</h3>
//             <p className="text-sm opacity-90">Setup vector database</p>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }