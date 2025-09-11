'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Image as ImageIcon, Calendar, Tag } from 'lucide-react';
import { Person, Photo, Event } from '@/types';
import { getEventById, getPhotosByPersonId, dummyPersons } from '@/lib/dummyData';

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const personId = params.personId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        // In real implementation:
        // const [eventRes, personRes, photosRes] = await Promise.all([
        //   fetch(`/api/events/${eventId}`),
        //   fetch(`/api/persons/${personId}`),
        //   fetch(`/api/persons/${personId}/photos`)
        // ]);
        
        // For now, use dummy data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const eventData = getEventById(eventId);
        const personData = dummyPersons.find(p => p.id === personId);
        const photosData = getPhotosByPersonId(personId);
        
        if (!eventData || !personData) {
          router.push(`/events/${eventId}`);
          return;
        }
        
        setEvent(eventData);
        setPerson(personData);
        setPhotos(photosData);
      } catch (error) {
        console.error('Failed to fetch person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [eventId, personId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event || !person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Person not found</h2>
          <Link href={`/events/${eventId}`} className="text-blue-600 hover:text-blue-700">
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
                href={`/events/${eventId}`}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-4">
                {/* Person Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{person.name}</h1>
                  <p className="text-gray-600 mt-1">Photos from {event.name}</p>
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
                {person.cluster_id}
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
            <p className="text-gray-600">This person hasn't been detected in any photos yet</p>
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
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center relative">
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                        
                        {/* Face detection indicator */}
                        {personFace && (
                          <div 
                            className="absolute border-2 border-green-400 bg-green-400 bg-opacity-20"
                            style={{
                              left: `${(personFace.facial_area.x / 500) * 100}%`,
                              top: `${(personFace.facial_area.y / 500) * 100}%`,
                              width: `${(personFace.facial_area.w / 500) * 100}%`,
                              height: `${(personFace.facial_area.h / 500) * 100}%`
                            }}
                          />
                        )}
                      </div>
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
                            Confidence: {(personFace.face_confidence * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Quality indicator */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${
                        photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
                      }`} title={`Quality Score: ${(photo.qualityScore * 100).toFixed(0)}%`}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Statistics */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{photos.length}</div>
                  <div className="text-sm text-gray-600">Total Photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(photos.reduce((sum, photo) => {
                      const face = photo.faces.find(f => f.cluster_id === person.cluster_id);
                      return sum + (face?.face_confidence || 0);
                    }, 0) / photos.length * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg. Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {photos.filter(p => p.isGoodQuality).length}
                  </div>
                  <div className="text-sm text-gray-600">High Quality</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}