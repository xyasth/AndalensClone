"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Edit, Users, Image as ImageIcon, Calendar, Plus, User, Loader2, AlertCircle } from "lucide-react";
import { Event, Person, Photo } from "@/types";
import PersonCard from '@/components/PersonCard'; // adjust path

export default function AlbumDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [album, setAlbum] = useState<Event | null>(null);
    const [persons, setPersons] = useState<Person[]>([]);
    const [sortBy, setSortBy] = useState<'alphabetical' | 'photoCount' | 'confidence' | 'numerical'>('numerical');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'people' | 'photos' | 'edit'>('people');

    const [editForm, setEditForm] = useState({
        name: "",
        title: "",
        description: "",
    });
    const sortedPersons = useMemo(() => {
        // First filter out the centroid person (cluster_id === '-1' or cluster_id === -1)
        const filteredPersons = persons.filter(person =>
            person.cluster_id !== '-1' && person.cluster_id !== -1
        );

        // Then sort the filtered persons
        const sorted = [...filteredPersons];

        switch (sortBy) {
            case 'numerical':
                // For names like "Person 1", "Person 2", etc., sort by cluster_id numerically
                return sorted.sort((a, b) => {
                    // If both are default "Person X" names, sort by cluster_id numerically
                    if (a.name.startsWith('Person ') && b.name.startsWith('Person ')) {
                        const aNum = parseInt(a.cluster_id);
                        const bNum = parseInt(b.cluster_id);
                        return aNum - bNum;
                    }
                    // Otherwise, sort alphabetically
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            case 'photoCount':
                return sorted.sort((a, b) => b.photoCount - a.photoCount);
            case 'confidence':
                return sorted.sort((a, b) => b.averageConfidence - a.averageConfidence);
            default:
                return sorted;
        }
    }, [persons, sortBy]);

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

    const PinterestPhotoCard = ({ photo }: { photo: Photo }) => {
        const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

        const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.target as HTMLImageElement;
            setImageDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        return (
            <div className="relative break-inside-avoid mb-4 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white">
                <div className="relative">
                    <img
                        src={`/api/photos/${photo.id}`}
                        alt={photo.originalName}
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        onLoad={handleImageLoad}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                                <div class="w-full h-64 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                    <svg class="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                            `;
                        }}
                    />

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        {/* Status badge */}
                        <div className={`text-xs px-2 py-1 rounded-full font-medium shadow-lg ${photo.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : photo.status === 'processing'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                            {photo.status}
                        </div>

                        {/* Quality indicator */}
                        <div
                            className={`w-4 h-4 rounded-full shadow-lg ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}
                        />
                    </div>

                    {/* Bottom info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="font-semibold text-sm mb-1 truncate">
                            {photo.originalName}
                        </h3>
                        <div className="flex items-center justify-between text-xs opacity-90">
                            <span>{photo.faces.length} faces detected</span>
                            <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        {imageDimensions && (
                            <div className="text-xs opacity-75 mt-1">
                                {imageDimensions.width} × {imageDimensions.height}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
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
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'people'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            People ({persons.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('photos')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'photos'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            All Photos ({photos.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'edit'
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
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">People in this album</h2>

                                {/* Sort Controls */}
                                {persons.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSortBy('numerical')}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === 'numerical'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            Numerical
                                        </button>
                                        <button
                                            onClick={() => setSortBy('photoCount')}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === 'photoCount'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            Most Photos
                                        </button>
                                        <button
                                            onClick={() => setSortBy('confidence')}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === 'confidence'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            Best Quality
                                        </button>
                                    </div>
                                )}
                            </div>
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
                                    {sortedPersons.map((person) => (
                                        <PersonCard
                                            key={person.id}
                                            person={person}
                                            onClick={() => router.push(`/dashboard/${album.id}/persons/${person.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Photos Tab - Pinterest Style */}
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
                                /* Pinterest-style masonry layout */
                                <div
                                    className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4"
                                    style={{ columnFill: 'balance' }}
                                >
                                    {photos.map((photo) => (
                                        <PinterestPhotoCard key={photo.id} photo={photo} />
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