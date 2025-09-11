export interface Event {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  photoCount: number;
  personCount: number;
}

export interface Album {
  id: string;
  name: string;
  event: {
    id: string;
    name: string;
  };
}

export interface FacialArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhotoMetadata {
  foto_id: string;
  album: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
  embedding: number[];
  cluster_id: string;
  path: string;
  facial_area: FacialArea;
  face_confidence: number;
}

export interface Person {
  id: string;
  name: string;
  cluster_id: string;
  photoCount: number;
  thumbnailPath?: string;
  eventId: string;
}

export interface Photo {
  id: string;
  path: string;
  originalName: string;
  eventId: string;
  albumId: string;
  uploadedAt: Date;
  faces: PhotoMetadata[];
  isProcessed: boolean;
  qualityScore: number;
  isGoodQuality: boolean;
}

export interface QualityCheckResult {
  isGood: boolean;
  score: number;
  reasons: string[];
}

export interface UploadResult {
  success: boolean;
  photos: Photo[];
  rejectedPhotos: {
    filename: string;
    reason: string;
  }[];
}