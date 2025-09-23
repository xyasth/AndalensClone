"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Edit, Users, Image as ImageIcon, Calendar, Plus, User, Loader2, AlertCircle } from "lucide-react";
import { Event, Person, Photo } from "@/types";

export default function AlbumDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [album, setAlbum] = useState<Event | null>(null);
    const [persons, setPersons] = useState<Person[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'people' | 'photos' | 'edit'>('people');

    const [editForm, setEditForm] = useState({
        name: "",
        title: "",
        description: "",
    });

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAlbumData();
        } else if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [id, status, router]);

    const fetchAlbumData = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('🔍 Fetching album data for ID:', id);
            
            // Fetch album details - REMOVED Authorization header
            const albumResponse = await fetch(`/api/events/${id}`);

            if (!albumResponse.ok) {
                if (albumResponse.status === 404) {
                    setError('Album not found');
                    return;
                }
                const errorText = await albumResponse.text();
                console.error('Album fetch error:', errorText);
                throw new Error(`Failed to fetch album: ${albumResponse.status}`);
            }

            const albumData = await albumResponse.json();
            console.log('📊 Album data received:', albumData);
            setAlbum(albumData);
            setEditForm({
                name: albumData.name || '',
                title: albumData.title || '',
                description: albumData.description || '',
            });

            // Fetch persons and photos in parallel
            await Promise.all([
                fetchPersonsForAlbum(id as string),
                fetchPhotosForAlbum(id as string)
            ]);

        } catch (error) {
            console.error('Failed to fetch album data:', error);
            setError('Failed to load album data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonsForAlbum = async (albumId: string) => {
        try {
            console.log('👥 Fetching persons for album:', albumId);
            
            // REMOVED Authorization header - uses getServerSession
            const personsResponse = await fetch(`/api/events/${albumId}/persons`);

            if (personsResponse.ok) {
                const personsData = await personsResponse.json();
                console.log('✅ Persons fetched:', personsData.length);
                setPersons(personsData);
            } else {
                console.error('Failed to fetch persons:', personsResponse.status);
            }
        } catch (error) {
            console.error('Failed to fetch persons:', error);
        }
    };

    const fetchPhotosForAlbum = async (albumId: string) => {
        try {
            console.log('📸 Fetching photos for album:', albumId);
            
            // REMOVED Authorization header - uses getServerSession
            const photosResponse = await fetch(`/api/events/${albumId}/photos`);

            if (photosResponse.ok) {
                const photosData = await photosResponse.json();
                console.log('✅ Photos fetched:', photosData.length);
                setPhotos(photosData);
            } else {
                console.error('Failed to fetch photos:', photosResponse.status);
            }
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        }
    };

    const handleEditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // REMOVED Authorization header - uses getServerSession
            const response = await fetch(`/api/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) {
                throw new Error('Failed to update album');
            }

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
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading album...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{error}</h2>
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                        ← Back to dashboard
                    </Link>
                </div>
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
                                    <p className="text-gray-600 mb-6">
                                        Process photos from Google Drive or upload photos to automatically detect and cluster people
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <Link
                                            href={`/upload?eventId=${album.id}`}
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Process Photos
                                        </Link>
                                        {album.driveLink && (
                                            <a
                                                href={album.driveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                View Drive Folder
                                            </a>
                                        )}
                                    </div>
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
                                                {person.thumbnailPath ? (
                                                    <img
                                                        src={person.thumbnailPath}
                                                        alt={person.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            // Fallback to avatar if thumbnail fails to load
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            target.parentElement!.innerHTML = `
                                                                <div class="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            `;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                        <User className="w-8 h-8 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600">
                                                {person.name}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {person.photoCount} photos
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {Math.round(person.averageConfidence * 100)}% confidence
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
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No photos processed yet</h3>
                                    <p className="text-gray-600 mb-6">
                                        Start by processing photos from Google Drive or uploading new ones
                                    </p>
                                    <Link
                                        href={`/upload?eventId=${album.id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Process Photos
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="group relative">
                                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                <img
                                                    src={`/api/photos/${photo.id}`}
                                                    alt={photo.originalName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback to placeholder if photo fails to load
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.parentElement!.innerHTML = `
                                                            <div class="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                                <svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        `;
                                                    }}
                                                />
                                            </div>
                                            
                                            <div className="absolute inset-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                                                <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-xs font-medium truncate">{photo.originalName}</p>
                                                    <p className="text-xs opacity-75">{photo.faces.length} faces</p>
                                                    <p className="text-xs opacity-75">
                                                        {new Date(photo.uploadedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="absolute top-2 right-2">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                                                }`} title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}></div>
                                            </div>

                                            <div className="absolute top-2 left-2">
                                                <div className={`text-xs px-2 py-1 rounded ${
                                                    photo.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : photo.status === 'processing'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {photo.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Tab */}
                {activeTab === 'edit' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Album</h2>
                            
                            <form onSubmit={handleEditSubmit} className="space-y-6">
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
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('people')}
                                        className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>

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

            {/* Debug Info Panel */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Debug Info
                    </h3>
                    <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Album ID:</strong> {album.id}</p>
                        <p><strong>Status:</strong> {album.status}</p>
                        <p><strong>Drive Link:</strong> {album.driveLink ? 'Yes' : 'No'}</p>
                        <p><strong>Persons Found:</strong> {persons.length}</p>
                        <p><strong>Photos Found:</strong> {photos.length}</p>
                        <p><strong>Photos with Faces:</strong> {photos.filter(p => p.faces.length > 0).length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}