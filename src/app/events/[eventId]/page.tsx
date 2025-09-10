'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Image as ImageIcon, User, Calendar } from 'lucide-react';
import { Event, Person, Photo } from '@/types';
import { getEventById, getPersonsByEventId, getPhotosByEventId } from '@/lib/dummyData';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'photos'>('people');

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        // In real implementation:
        // const [eventRes, personsRes, photosRes] = await Promise.all([
        //   fetch(`/api/events/${eventId}`),
        //   fetch(`/api/events/${eventId}/persons`),
        //   fetch(`/api/events/${eventId}/photos`)
        // ]);
        
        // For now, use dummy data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const eventData = getEventById(eventId);
        const personsData = getPersonsByEventId(eventId);
        const photosData = getPhotosByEventId(eventId);
        
        if (!eventData) {
          router.push('/events');
          return;
        }
        
        setEvent(eventData);
        setPersons(personsData);
        setPhotos(photosData);
      } catch (error) {
        console.error('Failed to fetch event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
          <Link href="/events" className="text-blue-600 hover:text-blue-700">
            ← Back to events
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
                href="/events"
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
                <p className="text-gray-600 mt-1">{event.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(event.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                {event.photoCount} photos
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {event.personCount} people
              </div>
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'people' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">People in this event</h2>
              {persons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No people detected yet</h3>
                  <p className="text-gray-600">Upload photos to automatically detect and cluster people</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {persons.map((person) => (
                    <Link
                      key={person.id}
                      href={`/events/${eventId}/persons/${person.id}`}
                      className="group bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        {person.thumbnailPath ? (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600">
                        {person.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {person.photoCount} photos
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">All photos</h2>
              {photos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No photos uploaded yet</h3>
                  <p className="text-gray-600 mb-6">Start by uploading photos to this event</p>
                  <Link
                    href={`/upload?eventId=${eventId}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
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
                      
                      {/* Photo info overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                        <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs font-medium truncate">{photo.originalName}</p>
                          <p className="text-xs opacity-75">{photo.faces.length} faces</p>
                        </div>
                      </div>
                      
                      {/* Quality indicator */}
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
      </div>
    </div>
  );
}