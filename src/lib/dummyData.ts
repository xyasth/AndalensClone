import { Event, Person, Photo, PhotoMetadata } from '@/types';

export const dummyEvents: Event[] = [
  {
    id: 'event-1',
    name: 'Birthday Party 2024',
    description: 'Sarah\'s 25th birthday celebration',
    createdAt: new Date('2024-03-15'),
    photoCount: 45,
    personCount: 8
  },
  {
    id: 'event-2',
    name: 'Wedding Reception',
    description: 'John & Emma\'s wedding reception',
    createdAt: new Date('2024-02-20'),
    photoCount: 120,
    personCount: 15
  },
  {
    id: 'event-3',
    name: 'Company Retreat',
    description: 'Annual team building event',
    createdAt: new Date('2024-01-10'),
    photoCount: 80,
    personCount: 25
  }
];

export const dummyPersons: Person[] = [
  {
    id: 'person-1',
    name: 'Sarah',
    cluster_id: 'cluster-sarah-001',
    photoCount: 12,
    thumbnailPath: '/dummy-photos/sarah-thumb.jpg',
    eventId: 'event-1'
  },
  {
    id: 'person-2',
    name: 'Mike',
    cluster_id: 'cluster-mike-001',
    photoCount: 8,
    thumbnailPath: '/dummy-photos/mike-thumb.jpg',
    eventId: 'event-1'
  },
  {
    id: 'person-3',
    name: 'Lisa',
    cluster_id: 'cluster-lisa-001',
    photoCount: 15,
    thumbnailPath: '/dummy-photos/lisa-thumb.jpg',
    eventId: 'event-1'
  },
  
  {
    id: 'person-4',
    name: 'John',
    cluster_id: 'cluster-john-001',
    photoCount: 25,
    thumbnailPath: '/dummy-photos/john-thumb.jpg',
    eventId: 'event-2'
  },
  {
    id: 'person-5',
    name: 'Emma',
    cluster_id: 'cluster-emma-001',
    photoCount: 28,
    thumbnailPath: '/dummy-photos/emma-thumb.jpg',
    eventId: 'event-2'
  },
  {
    id: 'person-6',
    name: 'David',
    cluster_id: 'cluster-david-001',
    photoCount: 18,
    thumbnailPath: '/dummy-photos/david-thumb.jpg',
    eventId: 'event-2'
  },
  
  {
    id: 'person-7',
    name: 'Alex',
    cluster_id: 'cluster-alex-001',
    photoCount: 20,
    thumbnailPath: '/dummy-photos/alex-thumb.jpg',
    eventId: 'event-3'
  },
  {
    id: 'person-8',
    name: 'Rachel',
    cluster_id: 'cluster-rachel-001',
    photoCount: 16,
    thumbnailPath: '/dummy-photos/rachel-thumb.jpg',
    eventId: 'event-3'
  }
];

const generatePhotoMetadata = (photoId: string, eventId: string, personIds: string[]): PhotoMetadata[] => {
  return personIds.map((personId, index) => ({
    foto_id: `${photoId}-face-${index}`,
    album: {
      id: `album-${eventId}`,
      name: dummyEvents.find(e => e.id === eventId)?.name || 'Unknown Event',
      event: {
        id: eventId,
        name: dummyEvents.find(e => e.id === eventId)?.name || 'Unknown Event'
      }
    },
    embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
    cluster_id: dummyPersons.find(p => p.id === personId)?.cluster_id || 'unknown-cluster',
    path: `/dummy-photos/${photoId}.jpg`,
    facial_area: {
      x: Math.random() * 500,
      y: Math.random() * 500,
      w: 100 + Math.random() * 100,
      h: 100 + Math.random() * 100
    },
    face_confidence: 0.8 + Math.random() * 0.2
  }));
};

export const dummyPhotos: Photo[] = [
  {
    id: 'photo-1',
    path: '/dummy-photos/birthday-1.jpg',
    originalName: 'birthday-group-1.jpg',
    eventId: 'event-1',
    albumId: 'album-event-1',
    uploadedAt: new Date('2024-03-15T14:30:00'),
    faces: generatePhotoMetadata('photo-1', 'event-1', ['person-1', 'person-2', 'person-3']),
    isProcessed: true,
    qualityScore: 0.92,
    isGoodQuality: true
  },
  {
    id: 'photo-2',
    path: '/dummy-photos/birthday-2.jpg',
    originalName: 'birthday-cake.jpg',
    eventId: 'event-1',
    albumId: 'album-event-1',
    uploadedAt: new Date('2024-03-15T15:45:00'),
    faces: generatePhotoMetadata('photo-2', 'event-1', ['person-1']),
    isProcessed: true,
    qualityScore: 0.88,
    isGoodQuality: true
  },
  
  {
    id: 'photo-3',
    path: '/dummy-photos/wedding-1.jpg',
    originalName: 'wedding-ceremony.jpg',
    eventId: 'event-2',
    albumId: 'album-event-2',
    uploadedAt: new Date('2024-02-20T16:00:00'),
    faces: generatePhotoMetadata('photo-3', 'event-2', ['person-4', 'person-5']),
    isProcessed: true,
    qualityScore: 0.95,
    isGoodQuality: true
  },
  {
    id: 'photo-4',
    path: '/dummy-photos/wedding-2.jpg',
    originalName: 'wedding-reception.jpg',
    eventId: 'event-2',
    albumId: 'album-event-2',
    uploadedAt: new Date('2024-02-20T18:30:00'),
    faces: generatePhotoMetadata('photo-4', 'event-2', ['person-4', 'person-5', 'person-6']),
    isProcessed: true,
    qualityScore: 0.89,
    isGoodQuality: true
  },
  
  {
    id: 'photo-5',
    path: '/dummy-photos/retreat-1.jpg',
    originalName: 'team-building.jpg',
    eventId: 'event-3',
    albumId: 'album-event-3',
    uploadedAt: new Date('2024-01-10T10:00:00'),
    faces: generatePhotoMetadata('photo-5', 'event-3', ['person-7', 'person-8']),
    isProcessed: true,
    qualityScore: 0.86,
    isGoodQuality: true
  }
];

export const getEventById = (eventId: string): Event | undefined => {
  return dummyEvents.find(event => event.id === eventId);
};

export const getPersonsByEventId = (eventId: string): Person[] => {
  return dummyPersons.filter(person => person.eventId === eventId);
};

export const getPhotosByEventId = (eventId: string): Photo[] => {
  return dummyPhotos.filter(photo => photo.eventId === eventId);
};

export const getPhotosByPersonId = (personId: string): Photo[] => {
  const person = dummyPersons.find(p => p.id === personId);
  if (!person) return [];
  
  return dummyPhotos.filter(photo => 
    photo.faces.some(face => face.cluster_id === person.cluster_id)
  );
};