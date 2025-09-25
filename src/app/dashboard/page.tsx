"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Image as ImageIcon, Users, Calendar, Loader2, AlertCircle, Folder, CloudDownload, ExternalLink, Eye } from "lucide-react";

// Updated Event interface to match new structure
interface Event {
  id: string;
  name: string;
  title: string;
  description?: string;
  createdAt: string;
  status: string;
  personCount: number;
  albums: Array<{
    id: string;
    name: string;
    photoCount: number;
    status: string;
    driveFolders: Array<{
      id: string;
      name: string;
      photoCount: number;
      status: string;
    }>;
  }>;
  totalAlbums: number;
  totalDriveFolders: number;
  totalPhotos: number;
}

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (status === 'authenticated') {
            fetchEvents();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch('/api/events');

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch events:', response.status, errorText);
                throw new Error(`Failed to fetch events: ${response.status}`);
            }

            const eventsData = await response.json();
            setEvents(eventsData);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            setError('Failed to load events. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-yellow-100 text-yellow-800';
            case 'active':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading your events...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
                    <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700">
                        Sign in to access your events
                    </Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Events</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
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
                            <h1 className="text-3xl font-bold text-gray-900">Your Photo Events</h1>
                            <p className="text-gray-600 mt-1">
                                Manage your photo collections with AI clustering
                                {session?.user?.email && (
                                    <span className="ml-2 text-sm">({session.user.email})</span>
                                )}
                            </p>
                        </div>
                        <Link
                            href="/upload"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Event
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {events.length === 0 ? (
                    // Empty State
                    <div className="text-center py-16">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No events yet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Create your first photo event to start organizing your photos with AI-powered face clustering.
                        </p>
                        <div className="space-y-4">
                            <Link
                                href="/upload"
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Create Your First Event
                            </Link>
                        </div>
                    </div>
                ) : (
                    // Events Grid
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Event Header */}
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                                {event.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">{event.name}</p>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                                                    {event.description}
                                                </p>
                                            )}
                                            <div className="flex items-center text-xs text-gray-500">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {new Date(event.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                                            {event.status}
                                        </span>
                                    </div>
                                    
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">{event.totalAlbums}</div>
                                            <div className="text-xs text-gray-500">Albums</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">{event.totalDriveFolders}</div>
                                            <div className="text-xs text-gray-500">Folders</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">{event.totalPhotos}</div>
                                            <div className="text-xs text-gray-500">Photos</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">{event.personCount}</div>
                                            <div className="text-xs text-gray-500">People</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Albums Section */}
                                <div className="p-6">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Albums</h4>
                                    {event.albums.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No albums yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {event.albums.slice(0, 3).map((album) => (
                                                <div key={album.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                                                    <div className="flex items-center">
                                                        <Folder className="w-4 h-4 text-blue-500 mr-2" />
                                                        <span className="text-sm font-medium text-gray-900">{album.name}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-500">
                                                            {album.photoCount} photos, {album.driveFolders.length} folders
                                                        </span>
                                                        <span className={`px-1 py-0.5 text-xs rounded ${getStatusColor(album.status)}`}>
                                                            {album.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {event.albums.length > 3 && (
                                                <p className="text-xs text-gray-500 text-center py-1">
                                                    +{event.albums.length - 3} more albums
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="px-6 pb-6">
                                    <div className="flex space-x-2">
                                        <Link
                                            href={`/dashboard/${event.id}`}
                                            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Event
                                        </Link>
                                        <Link
                                            href={`/upload?eventId=${event.id}`}
                                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Album
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* New Structure Info Panel */}
                <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-md">
                                <Folder className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                                Event → Albums → Drive Folders Structure
                            </h3>
                            <div className="mt-2 text-sm text-blue-700 space-y-1">
                                <p>• <strong>Hierarchical Organization:</strong> Events contain multiple Albums, Albums contain multiple Google Drive folders</p>
                                <p>• <strong>Flexible Structure:</strong> Create events like "Wedding" with albums like "Ceremony", "Reception", "Pre-wedding"</p>
                                <p>• <strong>Multiple Sources:</strong> Each album can link to multiple Google Drive folders from different photographers</p>
                                <p>• <strong>Event-Level People:</strong> Face clustering creates person groups at the event level (across all albums)</p>
                                <p>• <strong>Batch Processing:</strong> Process photos from multiple Drive folders and albums simultaneously</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}