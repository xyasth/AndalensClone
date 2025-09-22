'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Image as ImageIcon, Tag, Loader2, AlertCircle, Edit } from 'lucide-react';
import { Person, Photo, Event } from '@/types';

export default function AlbumPersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;
  const personId = params.personId as string;

  const [album, setAlbum] = useState<Event | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchPersonData();
  }, [albumId, personId]);

  const fetchPersonData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching person data for:', { albumId, personId });

      // Fetch album, person, and person's photos in parallel
      const [albumRes, personRes, photosRes] = await Promise.all([
        fetch(`/api/events/${albumId}`),
        fetch(`/api/persons/${personId}`),
        fetch(`/api/persons/${personId}/photos`)
      ]);

      if (!albumRes.ok) {
        throw new Error(`Album fetch failed: ${albumRes.status}`);
      }

      if (!personRes.ok) {
        if (personRes.status === 404) {
          setError('Person not found');
          return;
        }
        throw new Error(`Person fetch failed: ${personRes.status}`);
      }

      const albumData = await albumRes.json();
      const personData = await personRes.json();

      console.log('✅ Album and person data fetched successfully');
      setAlbum(albumData);
      setPerson(personData);
      setNewName(personData.name);

      if (photosRes.ok) {
        const photosResponse = await photosRes.json();
        console.log('✅ Person photos fetched:', photosResponse.photos?.length || 0);
        setPhotos(photosResponse.photos || []);
      } else {
        console.warn('Failed to fetch person photos:', photosRes.status);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Failed to fetch person data:', error);
      setError('Failed to load person data');
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!newName.trim() || newName === person?.name) {
      setEditingName(false);
      return;
    }

    try {
      const response = await fetch(`/api/persons/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to update person name');
      }

      // Update local state
      if (person) {
        setPerson({ ...person, name: newName.trim() });
      }

      setEditingName(false);
    } catch (error) {
      console.error('Failed to update person name:', error);
      alert('Failed to update name. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading person data...</p>
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
          <Link href={`/dashboard/${albumId}`} className="text-blue-600 hover:text-blue-700">
            ← Back to album
          </Link>
        </div>
      </div>
    );
  }

  if (!album || !person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Person not found</h2>
          <Link href={`/dashboard/${albumId}`} className="text-blue-600 hover:text-blue-700">
            ← Back to album
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
                href={`/dashboard/${albumId}`}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-4">
                {/* Person Avatar/Thumbnail */}
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  {person.thumbnailPath ? (
                    <img
                      src={`/api/persons/${person.id}/thumbnail`}
                      alt={person.name}
                      className="w-full h-full object-cover"
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="text-3xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
                          onBlur={handleNameUpdate}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleNameUpdate();
                            }
                            if (e.key === 'Escape') {
                              setNewName(person.name);
                              setEditingName(false);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <h1 className="text-3xl font-bold text-gray-900">{person.name}</h1>
                        <button
                          onClick={() => setEditingName(true)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-gray-600">Photos from {album.title}</p>
                  <p className="text-sm text-gray-500">{album.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                {photos.length} photos
              </div>
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                Cluster {person.cluster_id}
              </div>
              <div className="text-sm">
                {Math.round(person.averageConfidence * 100)}% avg confidence
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">All photos of {person.name}</h2>
          <p className="text-gray-600">
            These photos have been automatically grouped using AI face recognition
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">This person hasnt been detected in any photos yet</p>
          </div>
        ) : (
          <>
            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {photos.map((photo) => {
                // Find the face data for this person in this photo
                const personFace = photo.faces.find(face => face.cluster_id === person.cluster_id);

                return (
                  <div key={photo.id} className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                      <img
                        src={`/api/photos/${photo.id}`}
                        alt={photo.originalName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
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

                      {/* Face detection indicator overlay */}
                      {personFace && (
                        <div
                          className="absolute border-2 border-green-400 bg-green-400 bg-opacity-20 pointer-events-none"
                          style={{
                            left: `${(personFace.facial_area.x / 1000) * 100}%`,
                            top: `${(personFace.facial_area.y / 1000) * 100}%`,
                            width: `${(personFace.facial_area.w / 1000) * 100}%`,
                            height: `${(personFace.facial_area.h / 1000) * 100}%`,
                            minWidth: '20px',
                            minHeight: '20px'
                          }}
                        />
                      )}
                    </div>

                    {/* Photo info overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                      <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium truncate">{photo.originalName}</p>
                        <p className="text-xs opacity-75">
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                        {personFace && (
                          <p className="text-xs opacity-75">
                            Confidence: {Math.round(personFace.face_confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quality indicator */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                        }`} title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Statistics */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics for {person.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{photos.length}</div>
                  <div className="text-sm text-gray-600">Total Photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(person.averageConfidence * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg. Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {photos.filter(p => p.isGoodQuality).length}
                  </div>
                  <div className="text-sm text-gray-600">High Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {photos.reduce((sum, photo) => sum + photo.faces.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Faces</div>
                </div>
              </div>
            </div>

            {/* Debug Info */}
            <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Debug Information</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Person ID:</strong> {person.id}</p>
                <p><strong>Cluster ID:</strong> {person.cluster_id}</p>
                <p><strong>Album ID:</strong> {albumId}</p>
                <p><strong>Thumbnail Path:</strong> {person.thumbnailPath || 'None'}</p>
                <p><strong>Photos Loaded:</strong> {photos.length}</p>
                <p><strong>Photos with Faces:</strong> {photos.filter(p => p.faces.length > 0).length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}