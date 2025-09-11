import { Event, Person, Photo, Face } from '@/types';

export const dummyEvents: Event[] = [
  {
    id: 'event-1',
    name: 'Birthday Party 2024',
    title: 'Birthday Party 2024', // For compatibility with friend's album system
    description: 'Sarah\'s 25th birthday celebration',
    createdAt: '2024-03-15T10:00:00.000Z',
    photoCount: 45,
    personCount: 8,
    status: 'completed'
  },
  {
    id: 'event-2',
    name: 'Wedding Reception',
    title: 'Wedding Reception',
    description: 'John & Emma\'s wedding reception',
    createdAt: '2024-02-20T09:00:00.000Z',
    photoCount: 120,
    personCount: 15,
    status: 'completed'
  },
  {
    id: 'event-3',
    name: 'Company Retreat',
    title: 'Company Retreat',
    description: 'Annual team building event',
    createdAt: '2024-01-10T08:00:00.000Z',
    photoCount: 80,
    personCount: 25,
    status: 'processing'
  }
];

export const dummyPersons: Person[] = [
  {
    id: 'person-1',
    name: 'Person 1',
    cluster_id: 'cluster-sarah-001',
    photoCount: 12,
    thumbnailPath: '/dummy-photos/sarah-thumb.jpg',
    eventId: 'event-1',
    averageConfidence: 0.92,
    createdAt: '2024-03-15T14:30:00.000Z'
  },
  {
    id: 'person-2',
    name: 'Person 2',
    cluster_id: 'cluster-mike-001',
    photoCount: 8,
    thumbnailPath: '/dummy-photos/mike-thumb.jpg',
    eventId: 'event-1',
    averageConfidence: 0.88,
    createdAt: '2024-03-15T14:45:00.000Z'
  },
  {
    id: 'person-3',
    name: 'Person 3',
    cluster_id: 'cluster-lisa-001',
    photoCount: 15,
    thumbnailPath: '/dummy-photos/lisa-thumb.jpg',
    eventId: 'event-1',
    averageConfidence: 0.94,
    createdAt: '2024-03-15T15:00:00.000Z'
  },
  
  {
    id: 'person-4',
    name: 'Person 4',
    cluster_id: 'cluster-john-001',
    photoCount: 25,
    thumbnailPath: '/dummy-photos/john-thumb.jpg',
    eventId: 'event-2',
    averageConfidence: 0.96,
    createdAt: '2024-02-20T16:00:00.000Z'
  },
  {
    id: 'person-5',
    name: 'Person 5',
    cluster_id: 'cluster-emma-001',
    photoCount: 28,
    thumbnailPath: '/dummy-photos/emma-thumb.jpg',
    eventId: 'event-2',
    averageConfidence: 0.93,
    createdAt: '2024-02-20T16:15:00.000Z'
  },
  {
    id: 'person-6',
    name: 'Person 6',
    cluster_id: 'cluster-david-001',
    photoCount: 18,
    thumbnailPath: '/dummy-photos/david-thumb.jpg',
    eventId: 'event-2',
    averageConfidence: 0.89,
    createdAt: '2024-02-20T16:30:00.000Z'
  },
  
  {
    id: 'person-7',
    name: 'Person 7',
    cluster_id: 'cluster-alex-001',
    photoCount: 20,
    thumbnailPath: '/dummy-photos/alex-thumb.jpg',
    eventId: 'event-3',
    averageConfidence: 0.91,
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'person-8',
    name: 'Person 8',
    cluster_id: 'cluster-rachel-001',
    photoCount: 16,
    thumbnailPath: '/dummy-photos/rachel-thumb.jpg',
    eventId: 'event-3',
    averageConfidence: 0.87,
    createdAt: '2024-01-10T10:15:00.000Z'
  }
];

const generateFaceData = (photoId: string, eventId: string, personIds: string[]): Face[] => {
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
    uploadedAt: '2024-03-15T14:30:00.000Z',
    faces: generateFaceData('photo-1', 'event-1', ['person-1', 'person-2', 'person-3']),
    processedAt: '2024-03-15T14:35:00.000Z',
    status: 'completed',
    qualityScore: 0.92,
    isGoodQuality: true
  },
  {
    id: 'photo-2',
    path: '/dummy-photos/birthday-2.jpg',
    originalName: 'birthday-cake.jpg',
    eventId: 'event-1',
    uploadedAt: '2024-03-15T15:45:00.000Z',
    faces: generateFaceData('photo-2', 'event-1', ['person-1']),
    processedAt: '2024-03-15T15:50:00.000Z',
    status: 'completed',
    qualityScore: 0.88,
    isGoodQuality: true
  },
  
  {
    id: 'photo-3',
    path: '/dummy-photos/wedding-1.jpg',
    originalName: 'wedding-ceremony.jpg',
    eventId: 'event-2',
    uploadedAt: '2024-02-20T16:00:00.000Z',
    faces: generateFaceData('photo-3', 'event-2', ['person-4', 'person-5']),
    processedAt: '2024-02-20T16:05:00.000Z',
    status: 'completed',
    qualityScore: 0.95,
    isGoodQuality: true
  },
  {
    id: 'photo-4',
    path: '/dummy-photos/wedding-2.jpg',
    originalName: 'wedding-reception.jpg',
    eventId: 'event-2',
    uploadedAt: '2024-02-20T18:30:00.000Z',
    faces: generateFaceData('photo-4', 'event-2', ['person-4', 'person-5', 'person-6']),
    processedAt: '2024-02-20T18:35:00.000Z',
    status: 'completed',
    qualityScore: 0.89,
    isGoodQuality: true
  },
  
  {
    id: 'photo-5',
    path: '/dummy-photos/retreat-1.jpg',
    originalName: 'team-building.jpg',
    eventId: 'event-3',
    uploadedAt: '2024-01-10T10:00:00.000Z',
    faces: generateFaceData('photo-5', 'event-3', ['person-7', 'person-8']),
    status: 'processing',
    qualityScore: 0.86,
    isGoodQuality: true
  },
  {
    id: 'photo-6',
    path: '/dummy-photos/retreat-2.jpg',
    originalName: 'team-lunch.jpg',
    eventId: 'event-3',
    uploadedAt: '2024-01-10T12:00:00.000Z',
    faces: [],
    status: 'failed',
    qualityScore: 0.45,
    isGoodQuality: false
  }
];

// Helper functions
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

export const getPersonByClusterId = (clusterId: string): Person | undefined => {
  return dummyPersons.find(person => person.cluster_id === clusterId);
};

// Additional helper for getting photos by status
export const getPhotosByStatus = (status: Photo['status']): Photo[] => {
  return dummyPhotos.filter(photo => photo.status === status);
};

// Get processing statistics
export const getProcessingStats = () => {
  const totalPhotos = dummyPhotos.length;
  const completedPhotos = dummyPhotos.filter(p => p.status === 'completed').length;
  const processingPhotos = dummyPhotos.filter(p => p.status === 'processing').length;
  const failedPhotos = dummyPhotos.filter(p => p.status === 'failed').length;
  
  const totalFaces = dummyPhotos.reduce((sum, photo) => sum + photo.faces.length, 0);
  const goodQualityPhotos = dummyPhotos.filter(p => p.isGoodQuality).length;
  
  return {
    totalPhotos,
    completedPhotos,
    processingPhotos,
    failedPhotos,
    totalFaces,
    totalClusters: dummyPersons.length,
    goodQualityPhotos,
    qualityRejectionRate: ((totalPhotos - goodQualityPhotos) / totalPhotos) * 100
  };
};