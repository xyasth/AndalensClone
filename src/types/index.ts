// types/index.ts

export interface Event {
  id: string;
  name: string;
  title: string; // For compatibility with friend's album system
  description?: string;
  createdAt: string;
  photoCount: number;
  personCount: number;
  status: 'active' | 'processing' | 'completed';
}

// Alias for compatibility - Album and Event are the same thing
export type Album = Event;

export interface Person {
  id: string;
  name: string; // Generated name like "Person 1", "Person 2", etc.
  eventId: string;
  cluster_id: string;
  photoCount: number;
  thumbnailPath?: string;
  averageConfidence: number;
  createdAt: string;
}

export interface Photo {
  id: string;
  originalName: string;
  path: string; // R2 storage path
  eventId: string;
  uploadedAt: string;
  isGoodQuality: boolean;
  qualityScore: number;
  faces: Face[];
  processedAt?: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface Face {
  foto_id: string; // Unique ID for this face in this photo
  album: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  embedding: number[]; // ChromaDB embedding vector
  cluster_id: string; // Which person cluster this face belongs to
  path: string; // Path to the source photo
  facial_area: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  face_confidence: number; // 0-1 confidence that this is a face
}

export interface ProcessingActivity {
  id: string;
  type: 'upload' | 'quality_check' | 'face_detection' | 'clustering';
  status: 'processing' | 'completed' | 'failed';
  eventId: string;
  eventName: string;
  photoName: string;
  facesDetected?: number;
  clustersCreated?: number;
  timestamp: Date;
  error?: string;
}

export interface ClusteringStats {
  totalFaces: number;
  totalClusters: number;
  processedPhotos: number;
  pendingPhotos: number;
  averageConfidence: number;
  lastProcessed: Date | null;
  totalEvents: number;
  qualityRejectionRate: number;
}

export interface QualityCheckResult {
  isGood: boolean;
  score: number;
  reason?: string;
}

export interface ProcessingResult {
  success: boolean;
  facesDetected?: number;
  clustersCreated?: number;
  error?: string;
  faces?: Face[];
}