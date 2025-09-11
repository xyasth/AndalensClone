'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Image as ImageIcon, Tag } from 'lucide-react';
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

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        // In real implementation:
        // const [albumRes, personRes, photosRes] = await Promise.all([
        //   fetch(`/api/events/${albumId}`),
        //   fetch(`/api/persons/${personId}`),
        //   fetch(`/api/persons/${personId}/photos`)
        // ]);
        
        // For now, use dummy data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const albumData: Event = {
          id: albumId,
          name: 'Wedding Ceremony',
          title: "Joren's Wedding",
          description: 'A beautiful wedding ceremony held in Bali.',
          createdAt: new Date().toISOString(),
          photoCount: 45,
          personCount: 8,
          status: 'completed'
        };

        const personData: Person = {
          id: personId,
          name: 'Person 1',
          eventId: albumId,
          cluster_id: 'cluster-001',
          photoCount: 12,
          averageConfidence: 0.92,
          createdAt: new Date().toISOString()
        };

        const photosData: Photo[] = [
          {
            id: 'photo-1',
            originalName: 'wedding_ceremony_001.jpg',
            path: `/uploads/${albumId}/wedding_ceremony_001.jpg`,
            eventId: albumId,
            uploadedAt: new Date().toISOString(),
            isGoodQuality: true,
            qualityScore: 0.95,
            faces: [
              {
                foto_id: 'face-1-1',
                album: {
                  id: albumId,
                  name: albumData.name,
                  event: { id: albumId, name: albumData.name }
                },
                embedding: Array.from({length: 512}, () => Math.random()),
                cluster_id: 'cluster-001',
                path: `/uploads/${albumId}/wedding_ceremony_001.jpg`,
                facial_area: { x: 120, y: 80, w: 100, h: 120 },
                face_confidence: 0.92
              }
            ],
            processedAt: new Date().toISOString(),
            status: 'completed'
          },
          {
            id: 'photo-2',
            originalName: 'wedding_group_002.jpg',
            path: `/uploads/${albumId}/wedding_group_002.jpg`,
            eventId: albumId,
            uploadedAt: new Date().toISOString(),
            isGoodQuality: true,
            qualityScore: 0.88,
            faces: [
              {
                foto_id: 'face-2-1',
                album: {
                  id: albumId,
                  name: albumData.name,
                  event: { id: albumId, name: albumData.name }
                },
                embedding: Array.from({length: 512}, () => Math.random()),
                cluster_id: 'cluster-001',
                path: `/uploads/${albumId}/wedding_group_002.jpg`,
                facial_area: { x: 200, y: 100, w: 110, h: 130 },
                face_confidence: 0.89
              }
            ],
            processedAt: new Date().toISOString(),
            status: 'completed'
          }
        ];
        
        setAlbum(albumData);
        setPerson(personData);
        setPhotos(photosData);
      } catch (error) {
        console.error('Failed to fetch person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [albumId, personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                {/* Person Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{person.name}</h1>
                  <p className="text-gray-600 mt-1">Photos from {album.title}</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics for {person.name}</h3>
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