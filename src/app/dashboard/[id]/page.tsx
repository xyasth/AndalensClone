"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Users, Image as ImageIcon, Calendar, Plus, User } from "lucide-react";
import { Event, Person, Photo } from "@/types";

export default function AlbumDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [album, setAlbum] = useState<Event | null>(null);
    const [persons, setPersons] = useState<Person[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'people' | 'photos' | 'edit'>('people');

    const [editForm, setEditForm] = useState({
        name: "",
        title: "",
        description: "",
    });

    useEffect(() => {
        const fetchAlbumData = async () => {
            try {
                // In real implementation:
                // const [albumRes, personsRes, photosRes] = await Promise.all([
                //   fetch(`/api/events/${id}`),
                //   fetch(`/api/events/${id}/persons`),
                //   fetch(`/api/events/${id}/photos`)
                // ]);
                
                // Dummy data that matches your friend's original structure
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const albums = [
                    {
                        id: "1",
                        name: "Wedding Ceremony",
                        title: "Joren's Wedding",
                        description: "A beautiful wedding ceremony held in Bali.",
                        createdAt: new Date().toISOString(),
                        photoCount: 45,
                        personCount: 8,
                        status: 'completed' as const
                    },
                    {
                        id: "2",
                        name: "Birthday Party",
                        title: "Joren's 21st Birthday",
                        description: "A night full of fun, laughter, and memories.",
                        createdAt: new Date().toISOString(),
                        photoCount: 32,
                        personCount: 12,
                        status: 'completed' as const
                    },
                    {
                        id: "3",
                        name: "Graduation",
                        title: "Joren's High School Graduation",
                        description: "Celebrating the milestone of finishing high school.",
                        createdAt: new Date().toISOString(),
                        photoCount: 23,
                        personCount: 6,
                        status: 'processing' as const
                    },
                ];

                const albumData = albums.find((a) => a.id === id);
                
                if (!albumData) {
                    router.push('/dashboard');
                    return;
                }

                // Mock persons data
                const personsData: Person[] = [
                    {
                        id: 'person-1',
                        name: 'Person 1',
                        eventId: id as string,
                        cluster_id: 'cluster-001',
                        photoCount: 12,
                        averageConfidence: 0.92,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'person-2',
                        name: 'Person 2', 
                        eventId: id as string,
                        cluster_id: 'cluster-002',
                        photoCount: 8,
                        averageConfidence: 0.88,
                        createdAt: new Date().toISOString()
                    }
                ];

                // Mock photos data
                const photosData: Photo[] = [
                    {
                        id: 'photo-1',
                        originalName: `${albumData.name}_001.jpg`,
                        path: `/uploads/${id}/${albumData.name}_001.jpg`,
                        eventId: id as string,
                        uploadedAt: new Date().toISOString(),
                        isGoodQuality: true,
                        qualityScore: 0.95,
                        faces: [],
                        status: 'completed'
                    }
                ];

                setAlbum(albumData);
                setPersons(personsData);
                setPhotos(photosData);
                setEditForm({
                    name: albumData.name,
                    title: albumData.title,
                    description: albumData.description || "",
                });
            } catch (error) {
                console.error('Failed to fetch album data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbumData();
    }, [id, router]);

    const handleEditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // In real implementation:
            // await fetch(`/api/events/${id}`, {
            //   method: 'PUT',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(editForm)
            // });
            
            console.log("Updated album:", editForm);
            alert("Album updated successfully!");
            
            // Update local state
            if (album) {
                setAlbum({
                    ...album,
                    name: editForm.name,
                    title: editForm.title,
                    description: editForm.description
                });
            }
            
            setActiveTab('people');
        } catch (error) {
            console.error("Failed to update album:", error);
            alert("Failed to update album");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Album not found</h2>
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        ← Back to dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Link
                                href="/dashboard"
                                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{album.title}</h1>
                                <p className="text-gray-600 mt-1">{album.name}</p>
                                {album.description && (
                                    <p className="text-sm text-gray-500 mt-1">{album.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                {new Date(album.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                {album.photoCount} photos
                            </div>
                            <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                {album.personCount} people
                            </div>
                            <Link
                                href={`/upload?eventId=${album.id}`}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Photos
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('people')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'people'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            People ({persons.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('photos')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'photos'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            All Photos ({photos.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'edit'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Edit className="w-4 h-4 inline mr-1" />
                            Edit Album
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* People Tab */}
                {activeTab === 'people' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">People in this album</h2>
                            {persons.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                    <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No people detected yet</h3>
                                    <p className="text-gray-600 mb-6">Upload photos to automatically detect and cluster people</p>
                                    <Link
                                        href={`/upload?eventId=${album.id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Upload Photos
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {persons.map((person) => (
                                        <Link
                                            key={person.id}
                                            href={`/dashboard/${album.id}/persons/${person.id}`}
                                            className="group bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                            <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600">
                                                {person.name}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {person.photoCount} photos
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(person.averageConfidence * 100).toFixed(0)}% confidence
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Photos Tab */}
                {activeTab === 'photos' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">All photos</h2>
                            {photos.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                    <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No photos uploaded yet</h3>
                                    <p className="text-gray-600 mb-6">Start by uploading photos to this album</p>
                                    <Link
                                        href={`/upload?eventId=${album.id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Upload Photos
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="group relative">
                                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                    <ImageIcon className="w-8 h-8 text-gray-500" />
                                                </div>
                                            </div>
                                            
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                                                <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-xs font-medium truncate">{photo.originalName}</p>
                                                    <p className="text-xs opacity-75">{photo.faces.length} faces</p>
                                                </div>
                                            </div>
                                            
                                            <div className="absolute top-2 right-2">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                                                }`} title={`Quality Score: ${(photo.qualityScore * 100).toFixed(0)}%`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Tab - Your friend's original edit functionality */}
                {activeTab === 'edit' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Album</h2>
                            
                            <form onSubmit={handleEditSubmit} className="space-y-6">
                                {/* Event name input field */}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Event Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Title input field */}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={editForm.title}
                                        onChange={handleEditChange}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Description input field */}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={editForm.description}
                                        onChange={handleEditChange}
                                        rows={6}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-4 mt-8">
                                    {/* Cancel button */}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('people')}
                                        className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>

                                    {/* Save changes button */}
                                    <button
                                        type="submit"
                                        className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}