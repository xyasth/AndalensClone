"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Event } from "@/types";
import { Plus, Image as ImageIcon, Users, Calendar } from "lucide-react";

export default function Dashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch events/albums
        const fetchEvents = async () => {
            try {
                // In real implementation: const response = await fetch('/api/events');
                // For now, use dummy data that matches your friend's structure
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const eventsData: Event[] = [
                    {
                        id: "1",
                        name: "Wedding Ceremony",
                        title: "Joren's Wedding",
                        description: "A beautiful wedding ceremony held in Bali.",
                        createdAt: new Date().toISOString(),
                        photoCount: 45,
                        personCount: 8,
                        status: 'completed'
                    },
                    {
                        id: "2", 
                        name: "Birthday Party",
                        title: "Joren's 21st Birthday",
                        description: "A night full of fun, laughter, and memories.",
                        createdAt: new Date().toISOString(),
                        photoCount: 32,
                        personCount: 12,
                        status: 'completed'
                    },
                    {
                        id: "3",
                        name: "Graduation",
                        title: "Joren's High School Graduation", 
                        description: "Celebrating the milestone of finishing high school.",
                        createdAt: new Date().toISOString(),
                        photoCount: 23,
                        personCount: 6,
                        status: 'processing'
                    },
                ];
                
                setEvents(eventsData);
            } catch (error) {
                console.error('Failed to fetch events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

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
                            <h1 className="text-3xl font-bold text-gray-900">Your Photo Albums</h1>
                            <p className="text-gray-600 mt-1">Manage your photo collections with AI clustering</p>
                        </div>
                        <Link
                            href="/dashboard/add"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Album
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Add album button - keeping your friend's original design */}
                    <Link href="/dashboard/add">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors min-h-[200px]">
                            <Plus className="w-12 h-12 text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">Add New Album</p>
                            <p className="text-sm text-gray-500 mt-1">Create a new photo event</p>
                        </div>
                    </Link>

                    {/* Album cards - enhanced version of your friend's design */}
                    {events.map((album) => (
                        <div key={album.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden">
                            {/* Album thumbnail area */}
                            <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                                <ImageIcon className="w-12 h-12 text-blue-600" />
                                {album.status === 'processing' && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Album info */}
                            <div className="p-5">
                                <div className="mb-3">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                                        {album.name}
                                    </h2>
                                    <h3 className="text-sm font-medium text-blue-600 mb-2">
                                        {album.title}
                                    </h3>
                                    {album.description && (
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {album.description}
                                        </p>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <div className="flex items-center">
                                        <ImageIcon className="w-4 h-4 mr-1" />
                                        {album.photoCount} photos
                                    </div>
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-1" />
                                        {album.personCount} people
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                                    <div className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(album.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs ${
                                        album.status === 'completed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : album.status === 'processing'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {album.status}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <Link href={`/dashboard/${album.id}`} className="flex-1">
                                        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                            View Gallery
                                        </button>
                                    </Link>
                                    <Link 
                                        href={`/upload?eventId=${album.id}`}
                                        className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                        title="Add more photos"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty state */}
                {events.length === 0 && (
                    <div className="text-center py-12">
                        <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
                        <p className="text-gray-600 mb-6">Create your first album to start organizing photos with AI</p>
                        <Link
                            href="/dashboard/add"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Album
                        </Link>
                    </div>
                )}
            </div>

            {/* Info panel */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">How It Works</h3>
                    <p className="text-sm text-blue-700">
                        Create albums (photo events), upload photos, and our AI will automatically detect faces, 
                        check quality, and cluster photos by the people in them. Each person gets their own folder 
                        within the album with all their photos.
                    </p>
                </div>
            </div>
        </div>
    );
}