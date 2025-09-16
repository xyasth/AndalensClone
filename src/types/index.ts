// types/index.ts

export interface Event {
  id: string;
  name: string;
  title: string;
  description?: string;
  createdAt: string;
  photoCount: number;
  personCount: number;
  status: 'active' | 'processing' | 'completed';
  driveLink?: string;
  driveFolderId?: string;
}

export interface Person {
  id: string;
  name: string;
  eventId: string;
  cluster_id: string;
  photoCount: number;
  averageConfidence: number;
  thumbnailPath?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  originalName: string;
  path: string;
  eventId: string;
  uploadedAt: string;
  isGoodQuality: boolean;
  qualityScore: number;
  faces: Face[];
  processedAt?: string;
  status: 'processing' | 'completed' | 'failed';
  driveFileId?: string;
}

export interface Face {
  foto_id: string;
  album: {
    id: string;
    name: string;
    event: { id: string; name: string };
  };
  embedding: number[];
  cluster_id: string;
  path: string;
  facial_area: {
    x: number;
    y: number;
    w: number;
    h: number;
    left_eye?: [number, number];
    right_eye?: [number, number];
  };
  face_confidence: number;
}

// API Types matching your friend's API
export interface ClusteringAPIRequest {
  albums: {
    album_id: string;
    folder_id: string[];
  }[];
}

export interface ClusteringAPIResponse {
  extracted: {
    foto_id: string;
    face_id: string;
    album_id: string;
    drive_id: string;
    cluster_id: number;
    facial_area: {
      x: number;
      y: number;
      w: number;
      h: number;
      left_eye: [number, number];
      right_eye: [number, number];
    };
    face_confidence: number;
    embedding: number[];
  }[];
  centroid: {
    cluster_id: string;
    event_id: string | null;
    album_id: string;
    centroid_id: string;
    foto_id: string;
  }[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export interface Album {
  id: string;
  name: string;
  title: string;
  description?: string;
  driveLink?: string;
  driveFolderId?: string;
}