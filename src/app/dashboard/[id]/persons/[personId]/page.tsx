'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Image as ImageIcon, Tag, Loader2, AlertCircle, Edit } from 'lucide-react';
import { Person, Photo, Event } from '@/types';

// PhotoWithFaceOverlay component - inline for completeness
interface PhotoWithFaceOverlayProps {
  photo: Photo;
  person: Person;
}

const PhotoWithFaceOverlay = ({ photo, person }: PhotoWithFaceOverlayProps) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Find faces that belong to this person
  const personFaces = photo.faces.filter(face => face.personId === person.id);

  return (
    <div 
      className="relative break-inside-avoid mb-4 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
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

        {/* Face overlay rectangles */}
        {showOverlay && personFaces.map((face, index) => (
          <div
            key={index}
            className="absolute border-2 border-blue-400 bg-blue-400/20 transition-opacity duration-300"
            style={{
              left: `${(face.facialAreaX / (imageDimensions?.width || 1)) * 100}%`,
              top: `${(face.facialAreaY / (imageDimensions?.height || 1)) * 100}%`,
              width: `${(face.facialAreaW / (imageDimensions?.width || 1)) * 100}%`,
              height: `${(face.facialAreaH / (imageDimensions?.height || 1)) * 100}%`,
            }}
          >
            <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              {Math.round(face.faceConfidence * 100)}%
            </div>
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className={`text-xs px-2 py-1 rounded-full font-medium shadow-lg ${photo.status === 'completed'
            ? 'bg-green-500 text-white'
            : photo.status === 'processing'
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
            }`}>
            {photo.status}
          </div>

          <div className="flex items-center space-x-1">
            <div
              className={`w-4 h-4 rounded-full shadow-lg ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                }`}
              title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}
            />
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              {personFaces.length} face{personFaces.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-semibold text-sm mb-1 truncate">
            {photo.originalName}
          </h3>
          <div className="flex items-center justify-between text-xs opacity-90">
            <span>{photo.faces.length} total faces</span>
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

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const personId = params.personId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchPersonData();
  }, [eventId, personId]);

  const fetchPersonData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching person data for:', { eventId, personId });

      // Fetch event, person, and person's photos in parallel
      const [eventRes, personRes, photosRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/persons/${personId}`),
        fetch(`/api/persons/${personId}/photos`)
      ]);

      if (!eventRes.ok) {
        throw new Error(`Event fetch failed: ${eventRes.status}`);
      }

      if (!personRes.ok) {
        if (personRes.status === 404) {
          setError('Person not found');
          return;
        }
        throw new Error(`Person fetch failed: ${personRes.status}`);
      }

      const eventData = await eventRes.json();
      const personData = await personRes.json();

      console.log('Event and person data fetched successfully');
      setEvent(eventData);
      setPerson(personData);
      setNewName(personData.name);

      if (photosRes.ok) {
        const photosResponse = await photosRes.json();
        console.log('Person photos fetched:', photosResponse.photos?.length || 0);
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
          <Link href={`/dashboard/${eventId}`} className="text-blue-600 hover:text-blue-700">
            ← Back to event
          </Link>
        </div>
      </div>
    );
  }

  if (!event || !person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Person not found</h2>
          <Link href={`/dashboard/${eventId}`} className="text-blue-600 hover:text-blue-700">
            ← Back to event
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
                href={`/dashboard/${eventId}`}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-4">
                {/* Person Avatar/Thumbnail */}
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  {person.thumbnailPath ? (
                    <img
                      src={person.thumbnailPath}
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
                  <p className="text-gray-600">Photos from {event.title}</p>
                  <p className="text-sm text-gray-500">{event.name}</p>
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
                Cluster {person.clusterId}
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
            These photos have been automatically grouped using AI face recognition. Hover over photos to see face detection boxes.
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">This person hasn't been detected in any photos yet</p>
          </div>
        ) : (
          <>
            {/* Photos Masonry Grid */}
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
              {photos.map((photo) => (
                <PhotoWithFaceOverlay
                  key={photo.id}
                  photo={photo}
                  person={person}
                />
              ))}
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
                    {photos.reduce((sum, photo) => {
                      return sum + photo.faces.filter(face => face.personId === person.id).length;
                    }, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Face Detections</div>
                </div>
              </div>
            </div>

            {/* Face Quality Distribution */}
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Detection Quality</h3>
              <div className="space-y-2">
                {(() => {
                  const allFaces = photos.flatMap(photo => 
                    photo.faces.filter(face => face.personId === person.id)
                  );
                  const highConfidence = allFaces.filter(face => face.faceConfidence > 0.8).length;
                  const mediumConfidence = allFaces.filter(face => face.faceConfidence > 0.6 && face.faceConfidence <= 0.8).length;
                  const lowConfidence = allFaces.filter(face => face.faceConfidence <= 0.6).length;
                  const total = allFaces.length;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">High Confidence (&gt;80%)</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${total > 0 ? (highConfidence / total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{highConfidence}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Medium Confidence (60-80%)</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${total > 0 ? (mediumConfidence / total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{mediumConfidence}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Low Confidence (&lt;60%)</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${total > 0 ? (lowConfidence / total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{lowConfidence}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Debug Info */}
            <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Debug Information</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Person ID:</strong> {person.id}</p>
                <p><strong>Cluster ID:</strong> {person.clusterId}</p>
                <p><strong>Event ID:</strong> {eventId}</p>
                <p><strong>Thumbnail Path:</strong> {person.thumbnailPath || 'None'}</p>
                <p><strong>Photos Loaded:</strong> {photos.length}</p>
                <p><strong>Photos with Faces:</strong> {photos.filter(p => p.faces.some(f => f.personId === person.id)).length}</p>
                <p><strong>Total Face Detections:</strong> {photos.reduce((sum, photo) => sum + photo.faces.filter(face => face.personId === person.id).length, 0)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}