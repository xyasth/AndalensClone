"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Edit, Users, Image as ImageIcon, Calendar, Plus, User, Loader2, AlertCircle, Folder, CloudDownload } from "lucide-react";
import { Event, Person, Photo } from "@/types";

// PersonCard component - inline for completeness
interface PersonCardProps {
  person: Person;
  onClick: () => void;
}

const PersonCard = ({ person, onClick }: PersonCardProps) => (
  <div
    onClick={onClick}
    className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
  >
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden">
        {person.thumbnailPath ? (
          <img
            src={person.thumbnailPath}
            alt={person.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
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
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
        {person.name}
      </h3>
      <p className="text-sm text-gray-600 mb-2">{person.photoCount} photos</p>
      <div className="flex items-center justify-center text-xs text-gray-500">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-1 ${
            person.averageConfidence > 0.8 ? 'bg-green-400' :
            person.averageConfidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          {Math.round(person.averageConfidence * 100)}% confidence
        </div>
      </div>
    </div>
  </div>
);

export default function EventDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [event, setEvent] = useState<Event | null>(null);
    const [persons, setPersons] = useState<Person[]>([]);
    const [sortBy, setSortBy] = useState<'alphabetical' | 'photoCount' | 'confidence' | 'numerical'>('numerical');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'people' | 'albums' | 'photos' | 'edit'>('people');

    const [editForm, setEditForm] = useState({
        name: "",
        title: "",
        description: "",
    });

    const sortedPersons = useMemo(() => {
        const filteredPersons = persons.filter(person =>
            String(person.clusterId) !== '-1'
        );

        const sorted = [...filteredPersons];

        switch (sortBy) {
            case 'numerical':
                return sorted.sort((a, b) => {
                    if (a.name.startsWith('Person ') && b.name.startsWith('Person ')) {
                        const aNum = parseInt(a.clusterId);
                        const bNum = parseInt(b.clusterId);
                        return aNum - bNum;
                    }
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            case 'photoCount':
                return sorted.sort((a, b) => b.photoCount - a.photoCount);
            case 'confidence':
                return sorted.sort((a, b) => b.averageConfidence - a.averageConfidence);
            case 'alphabetical':
                return sorted.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            default:
                return sorted;
        }
    }, [persons, sortBy]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchEventData();
        } else if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [id, status, router]);

    const fetchEventData = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('Fetching event data for ID:', id);

            // Fetch event details
            const eventResponse = await fetch(`/api/events/${id}`);

            if (!eventResponse.ok) {
                if (eventResponse.status === 404) {
                    setError('Event not found');
                    return;
                }
                const errorText = await eventResponse.text();
                console.error('Event fetch error:', errorText);
                throw new Error(`Failed to fetch event: ${eventResponse.status}`);
            }

            const eventData = await eventResponse.json();
            console.log('Event data received:', eventData);
            setEvent(eventData);
            setEditForm({
                name: eventData.name || '',
                title: eventData.title || '',
                description: eventData.description || '',
            });

            // Fetch persons and photos in parallel
            await Promise.all([
                fetchPersonsForEvent(id as string),
                fetchPhotosForEvent(id as string)
            ]);

        } catch (error) {
            console.error('Failed to fetch event data:', error);
            setError('Failed to load event data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonsForEvent = async (eventId: string) => {
        try {
            console.log('Fetching persons for event:', eventId);

            const personsResponse = await fetch(`/api/events/${eventId}/persons`);

            if (personsResponse.ok) {
                const personsData = await personsResponse.json();
                console.log('Persons fetched:', personsData.length);
                setPersons(personsData);
            } else {
                console.error('Failed to fetch persons:', personsResponse.status);
            }
        } catch (error) {
            console.error('Failed to fetch persons:', error);
        }
    };

    const fetchPhotosForEvent = async (eventId: string) => {
        try {
            console.log('Fetching photos for event:', eventId);

            const photosResponse = await fetch(`/api/events/${eventId}/photos`);

            if (photosResponse.ok) {
                const photosData = await photosResponse.json();
                console.log('Photos fetched:', photosData.length);
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
            const response = await fetch(`/api/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) {
                throw new Error('Failed to update event');
            }

            if (event) {
                setEvent({
                    ...event,
                    name: editForm.name,
                    title: editForm.title,
                    description: editForm.description
                });
            }

            setActiveTab('people');
        } catch (error) {
            console.error("Failed to update event:", error);
            alert("Failed to update event");
        }
    };

    // Pinterest-style photo card component
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

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <div className={`text-xs px-2 py-1 rounded-full font-medium shadow-lg ${photo.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : photo.status === 'processing'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                            {photo.status}
                        </div>

                        <div
                            className={`w-4 h-4 rounded-full shadow-lg ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}
                        />
                    </div>

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
                    <p>Loading event...</p>
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

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
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
                                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                                <p className="text-gray-600 mt-1">{event.name}</p>
                                {event.description && (
                                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                {new Date(event.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                                <Folder className="w-4 h-4 mr-2" />
                                {event.totalAlbums} albums
                            </div>
                            <div className="flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                {event.totalPhotos} photos
                            </div>
                            <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                {event.personCount} people
                            </div>
                            <Link
                                href={`/upload?eventId=${event.id}`}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Album
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
                            onClick={() => setActiveTab('albums')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'albums'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Albums ({event.totalAlbums})
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
                            Edit Event
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
                                <h2 className="text-2xl font-semibold text-gray-900">People in this event</h2>

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
                                        <button
                                            onClick={() => setSortBy('alphabetical')}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === 'alphabetical'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            A-Z
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
                                            href={`/upload?eventId=${event.id}`}
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Process Photos
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {sortedPersons.map((person) => (
                                        <PersonCard
                                            key={person.id}
                                            person={person}
                                            onClick={() => router.push(`/dashboard/${event.id}/persons/${person.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Albums Tab */}
                {activeTab === 'albums' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-semibold text-gray-900">Albums</h2>
                            <Link
                                href={`/upload?eventId=${event.id}`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Album
                            </Link>
                        </div>
                        {event.albums.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                <Folder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
                                <p className="text-gray-600 mb-6">
                                    Create your first album to start organizing photos
                                </p>
                                <Link
                                    href={`/upload?eventId=${event.id}`}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Album
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {event.albums.map((album) => (
                                    <div key={album.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900">{album.name}</h3>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    album.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    album.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {album.status}
                                                </span>
                                            </div>
                                            {album.description && (
                                                <p className="text-gray-600 text-sm mb-4">{album.description}</p>
                                            )}
                                            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                                                <div>
                                                    <div className="text-lg font-semibold text-gray-900">{album.photoCount}</div>
                                                    <div className="text-xs text-gray-500">Photos</div>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-semibold text-gray-900">{album.driveFolders.length}</div>
                                                    <div className="text-xs text-gray-500">Folders</div>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-semibold text-gray-900">
                                                        {album.driveFolders.reduce((sum, folder) => sum + folder.photoCount, 0)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Drive Photos</div>
                                                </div>
                                            </div>
                                            {album.driveFolders.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Drive Folders:</h4>
                                                    <div className="space-y-1">
                                                        {album.driveFolders.map((folder, index) => (
                                                            <div key={index} className="flex items-center justify-between text-xs">
                                                                <span className="text-gray-600 truncate">{folder.name}</span>
                                                                <span className="text-gray-500">{folder.photoCount} photos</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/albums/${album.id}`}
                                                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                                                >
                                                    View Album
                                                </Link>
                                                <Link
                                                    href={`/upload?eventId=${event.id}&albumId=${album.id}`}
                                                    className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                        href={`/upload?eventId=${event.id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Process Photos
                                    </Link>
                                </div>
                            ) : (
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
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Event</h2>

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
        </div>
    );
}