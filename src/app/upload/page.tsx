// app/upload/page.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Upload as UploadIcon, 
  X, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FolderPlus,
  Brain,
  ArrowLeft,
  Link as LinkIcon,
  ExternalLink,
  CloudDownload,
  RefreshCw
} from 'lucide-react';
import { Album, DriveFile } from '@/types';

interface UploadFile extends File {
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'quality-check' | 'clustering' | 'completed' | 'error';
  error?: string;
  qualityScore?: number;
  facesDetected?: number;
  clustersCreated?: number;
  source?: 'upload' | 'drive';
}

export default function UploadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId');
  const autoStart = searchParams.get('autoStart') === 'true';
  
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [newEventName, setNewEventName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDriveLink, setNewEventDriveLink] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // Google Drive related states
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<Set<string>>(new Set());
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [showDriveSection, setShowDriveSection] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  // Fetch albums on load
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await fetch('/api/events', {
          headers: {
            'Authorization': `Bearer ${(session as any).accessToken}`
          }
        });

        if (response.ok) {
          const albumsData = await response.json();
          setAlbums(albumsData);
        } else {
          console.error('Failed to fetch albums:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error);
      } finally {
        setAlbumsLoading(false);
      }
    };

    if (session) {
      fetchAlbums();
    }
  }, [session]);

  // Load drive files when album with drive link is selected
  useEffect(() => {
    const selectedAlbum = albums.find(a => a.id === selectedEventId);
    if (selectedAlbum?.driveLink) {
      setShowDriveSection(true);
      if (driveFiles.length === 0 && selectedAlbum.driveFolderId) {
        loadDriveFiles(selectedAlbum.driveFolderId);
      }
    } else {
      setShowDriveSection(false);
      setDriveFiles([]);
    }
  }, [selectedEventId, albums]);

  // Auto-open file picker or drive section if coming from "Create Album"
  useEffect(() => {
    if (autoStart && selectedEventId) {
      const selectedAlbum = albums.find(a => a.id === selectedEventId);
      if (selectedAlbum?.driveLink && selectedAlbum.driveFolderId) {
        setShowDriveSection(true);
        loadDriveFiles(selectedAlbum.driveFolderId);
      } else {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 1000);
      }
    }
  }, [autoStart, selectedEventId, albums]);

  const loadDriveFiles = async (folderId: string) => {
    setIsDriveLoading(true);
    setDriveError('');

    try {
      console.log('📁 Loading Drive files from folder:', folderId);
      
      const response = await fetch(`/api/drive/files?folderId=${folderId}`, {
        headers: {
          'Authorization': `Bearer ${(session as any).accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google Drive access expired. Please sign in again.');
        }
        throw new Error(`Failed to load Drive files: ${response.status}`);
      }

      const files = await response.json();
      console.log('📥 Drive files loaded:', files.length);
      setDriveFiles(files);
    } catch (error) {
      console.error('Failed to load Drive files:', error);
      setDriveError(error instanceof Error ? error.message : 'Failed to load files from Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const processDriveFiles = async () => {
    if (selectedDriveFiles.size === 0) {
      alert('Please select at least one Drive file to process');
      return;
    }

    if (!selectedEventId) {
      alert('Please select an album first');
      return;
    }

    console.log('🚀 Processing Drive files:', Array.from(selectedDriveFiles));

    // Use the selected album's driveFolderId for the API call
    const selectedAlbum = albums.find(a => a.id === selectedEventId);
    if (!selectedAlbum?.driveFolderId) {
      alert('Drive folder ID not found for this album');
      return;
    }

    try {
      // Call the clustering API with the proper format
      const clusteringRequest = {
        albums: [{
          album_id: selectedEventId,
          folder_id: [selectedAlbum.driveFolderId] // Use the actual Drive folder ID
        }]
      };

      console.log('📝 Sending clustering request:', clusteringRequest);

      const response = await fetch('/api/photos/cluster', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken}`
        },
        body: JSON.stringify(clusteringRequest)
      });

      if (!response.ok) {
        throw new Error(`Clustering API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Clustering completed:', result);

      // Update UI to show success
      alert(`Processing completed! Found ${result.extracted?.length || 0} faces in ${result.centroid?.length || 0} clusters.`);
      
      // Redirect to album view
      router.push(`/dashboard/${selectedEventId}`);
    } catch (error) {
      console.error('❌ Failed to process Drive files:', error);
      alert('Failed to process files. Please try again.');
    }

    // Clear selection
    setSelectedDriveFiles(new Set());
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedEventId) {
      alert('Please select an album first');
      return;
    }

    if (acceptedFiles.length + files.length > 100) {
      alert('Maximum 100 files allowed per upload');
      return;
    }

    const newFiles: UploadFile[] = acceptedFiles.map(file => {
      const uploadFile = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        source: 'upload' as const,
        preview: URL.createObjectURL(file)
      });
      return uploadFile;
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    // For now, just simulate processing since we're focusing on Drive integration
    newFiles.forEach(file => {
      simulateFileProcessing(file);
    });

    setProcessingStats(prev => ({
      ...prev,
      total: prev.total + newFiles.length
    }));
  }, [files.length, selectedEventId]);

  const simulateFileProcessing = async (file: UploadFile) => {
    // Simulate upload
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'uploading' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate quality check
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'quality-check' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate clustering
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'clustering' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Complete
    const facesDetected = Math.floor(Math.random() * 3) + 1;
    const clustersCreated = Math.floor(Math.random() * 2) + 1;
    
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { 
        ...f, 
        status: 'completed',
        facesDetected,
        clustersCreated
      } : f
    ));

    setProcessingStats(prev => ({
      ...prev,
      processed: prev.processed + 1,
      successful: prev.successful + 1
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    onDrop(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      onDrop(selectedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const createEvent = async () => {
    if (!newEventName.trim() || !newEventTitle.trim()) return;
    
    try {
      setIsCreatingEvent(true);
      
      const eventData = {
        name: newEventName,
        title: newEventTitle,
        description: '',
        driveLink: newEventDriveLink || undefined,
        driveFolderId: newEventDriveLink ? extractFolderId(newEventDriveLink) : undefined
      };

      console.log('📝 Creating event:', eventData);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const newEvent = await response.json();
      console.log('✅ Event created:', newEvent);
      
      setAlbums(prev => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
      setNewEventName('');
      setNewEventTitle('');
      setNewEventDriveLink('');
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create album. Please try again.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const extractFolderId = (driveLink: string) => {
    const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const validateDriveLink = (link: string) => {
    if (!link.trim()) return true;
    const drivePatterns = [
      /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/,
      /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/
    ];
    return drivePatterns.some(pattern => pattern.test(link));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'quality-check':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'clustering':
        return <Brain className="w-4 h-4 text-purple-500 animate-pulse" />;
      default:
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const selectedAlbum = albums.find(a => a.id === selectedEventId);

  if (albumsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading albums...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload & Auto-Process Photos</h1>
              <p className="text-gray-600 mt-1">
                Process photos from Google Drive or direct uploads - powered by AI clustering
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Album Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Album</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose existing album
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an album...</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.title} ({album.name})
                    {album.driveLink && ' 📁 Drive Linked'}
                  </option>
                ))}
              </select>
              
              {selectedAlbum?.driveLink && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center text-sm text-green-800">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    <span>Linked to Google Drive folder</span>
                    <a 
                      href={selectedAlbum.driveLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-green-600 hover:text-green-700"
                    >
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create new album
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="Event name (e.g., Wedding Ceremony)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Album title (e.g., Joren's Wedding)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  value={newEventDriveLink}
                  onChange={(e) => setNewEventDriveLink(e.target.value)}
                  placeholder="Google Drive folder link (https://drive.google.com/drive/folders/...)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    newEventDriveLink && !validateDriveLink(newEventDriveLink)
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {newEventDriveLink && !validateDriveLink(newEventDriveLink) && (
                  <p className="text-sm text-red-600">Please enter a valid Google Drive folder link</p>
                )}
                <button
                  onClick={createEvent}
                  disabled={
                    !Boolean(newEventName.trim()) ||
                    !Boolean(newEventTitle.trim()) ||
                    Boolean(isCreatingEvent) ||
                    (Boolean(newEventDriveLink) && !validateDriveLink(newEventDriveLink))
                  }
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isCreatingEvent ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FolderPlus className="w-4 h-4 mr-2" />
                  )}
                  Create Album
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Google Drive Integration - KEY FEATURE */}
        {showDriveSection && selectedAlbum?.driveLink && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CloudDownload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Google Drive Photos</h2>
              </div>
              <button
                onClick={() => selectedAlbum.driveFolderId && loadDriveFiles(selectedAlbum.driveFolderId)}
                disabled={isDriveLoading}
                className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isDriveLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {driveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {driveError}
                {driveError.includes('expired') && (
                  <Link href="/auth/signin" className="block mt-2 text-red-800 underline">
                    Re-authenticate with Google Drive
                  </Link>
                )}
              </div>
            )}

            {isDriveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading files from Google Drive...</span>
              </div>
            ) : driveFiles.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                        selectedDriveFiles.has(file.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedDriveFiles);
                        if (newSelected.has(file.id)) {
                          newSelected.delete(file.id);
                        } else {
                          newSelected.add(file.id);
                        }
                        setSelectedDriveFiles(newSelected);
                      }}
                    >
                      <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2">
                        {file.thumbnailLink ? (
                          <img 
                            src={file.thumbnailLink} 
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.size}</p>
                      
                      {selectedDriveFiles.has(file.id) && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle className="w-5 h-5 text-blue-600 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedDriveFiles.size} of {driveFiles.length} files selected
                  </span>
                  <button
                    onClick={processDriveFiles}
                    disabled={selectedDriveFiles.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Process Selected Files
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No images found in the linked Drive folder
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Brain className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                🔥 KEY INTEGRATION POINTS - Where to Connect Your ML API
              </h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• <strong>Drive Processing:</strong> When "Process Selected Files" is clicked, it calls `/api/photos/cluster`</p>
                <p>• <strong>API Format:</strong> Sends `{`albums: [{album_id, folder_id: [drive_folder_id]}]`}` to your ML API</p>
                <p>• <strong>Expected Response:</strong> `{`extracted: [...faces], centroid: [...clusters]`}` format</p>
                <p>• <strong>Database:</strong> Results are automatically saved to Neon DB with proper face clustering</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}