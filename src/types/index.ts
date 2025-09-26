// types/index.ts - Updated to match new Event→Album→DriveFolder structure

export interface DriveFolder {
  id: string;
  name: string;
  driveLink: string;
  driveFolderId: string;
  photoCount: number;
  status: 'active' | 'processing' | 'completed' | 'error';
  createdAt?: string;
  updatedAt?: string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  eventId: string;
  photoCount: number;
  status: 'active' | 'processing' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  driveFolders: DriveFolder[];
}

export interface Event {
  id: string;
  name: string;
  title: string;
  description?: string;
  createdAt: string;
  status: 'active' | 'processing' | 'completed';
  personCount: number;
  
  // NEW: Album-based structure
  albums: Album[];
  totalAlbums: number;
  totalDriveFolders: number;
  totalPhotos: number;
}

export interface Person {
  id: string;
  name: string;
  eventId: string; // Changed: now belongs to Event, not Album
  clusterId: string;
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
  albumId?: string; // NEW: Link to album
  driveFolderId?: string; // NEW: Link to specific drive folder
  uploadedAt: string;
  isGoodQuality: boolean;
  qualityScore: number;
  faces: Face[];
  processedAt?: string;
  status: 'processing' | 'completed' | 'failed';
  driveFileId?: string;
}

export interface Face {
  id: string;
  fotoId: string;
  photoId: string;
  personId?: string;
  clusterId: string;
  embedding: number[];
  facialAreaX: number;
  facialAreaY: number;
  facialAreaW: number;
  facialAreaH: number;
  faceConfidence: number;
  createdAt: string;
}

// API Types matching your clustering API
export interface ClusteringAPIRequest {
  albums: {
    album_id: string;
    folder_id: string[]; // Multiple folder IDs per album
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

// User type to include events relation
export interface User {
  id: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified?: Date;
  image?: string;
  events: Event[];
}

export interface ProcessingActivity {
  id: string;
  type: 'UPLOAD' | 'QUALITY_CHECK' | 'FACE_DETECTION' | 'CLUSTERING';
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  eventId: string;
  albumId?: string;
  eventName: string;
  albumName?: string;
  photoName: string;
  facesDetected?: number;
  clustersCreated?: number;
  timestamp: string;
  error?: string;
}

export interface IQAResult {
  file_name: string;
  prediction: {
    label: 'good' | 'bad';
    confidence: number;
  };
}

export interface IQAFolderResult {
  folder_id: string;
  results: IQAResult[];
  error?: string;
}

export interface IQAResponse {
  folders: IQAFolderResult[];
}

export interface IQARequest {
  folder_id: string[];
}

export interface DriveFileWithQuality extends DriveFile {
  qualityAssessment?: {
    label: 'good' | 'bad';
    confidence: number;
    assessed: boolean;
  };
}