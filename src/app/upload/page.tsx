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
import { Event, Album, DriveFile } from '@/types';

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

interface DriveImageProps {
  file: DriveFile;
  session: any;
}

export default function UploadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId');
  const preselectedAlbumId = searchParams.get('albumId'); // NEW: Support album selection
  const autoStart = searchParams.get('autoStart') === 'true';
  
  // UPDATED: State management for Events + Albums structure
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [selectedAlbumId, setSelectedAlbumId] = useState(preselectedAlbumId || '');
  const [newEventName, setNewEventName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDriveLinks, setNewAlbumDriveLinks] = useState(['']); // Support multiple drive links
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<Set<string>>(new Set());
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [showDriveSection, setShowDriveSection] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UPDATED: Separate states for events and albums
  const [events, setEvents] = useState<Event[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Drive Image Component with Fallback (unchanged)
  const DriveImageWithFallback: React.FC<DriveImageProps> = ({ file, session }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;
      
      const loadImage = async () => {
        try {
          setImageLoading(true);
          setImageError(false);
          
          const imageSources = [
            file.thumbnailLink ? `${file.thumbnailLink}=s400` : null,
            file.thumbnailLink ? `${file.thumbnailLink}=s200-c` : null,
            `/api/drive/thumbnail?fileId=${file.id}`,
          ].filter(Boolean);

          for (const source of imageSources) {
            if (!mounted) return;
            
            try {
              await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = source!;
                setTimeout(() => reject(), 3000);
              });
              
              if (mounted) {
                setImageUrl(source!);
                setImageLoading(false);
                return;
              }
            } catch {
              continue;
            }
          }
          
          if (mounted) {
            setImageError(true);
            setImageLoading(false);
          }
          
        } catch (error) {
          if (mounted) {
            setImageError(true);
            setImageLoading(false);
          }
        }
      };

      loadImage();
      return () => { mounted = false; };
    }, [file.id, file.thumbnailLink]);

    if (imageLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      );
    }

    if (imageError || !imageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      );
    }

    return (
      <img 
        src={imageUrl}
        alt={file.name}
        className="w-full h-full object-cover"
        onError={() => {
          setImageError(true);
          setImageUrl(null);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
      />
    );
  };

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

  if (!session || !session.user?.email) {
    router.push('/auth/signin');
    return null;
  }

  // UPDATED: Fetch events on load
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');

        if (response.ok) {
          const eventsData = await response.json();
          setEvents(eventsData);
        } else {
          console.error('Failed to fetch events:', response.status);
          
          if (response.status === 401) {
            console.error('User not authenticated - redirecting to signin');
            router.push('/auth/signin');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    if (session) {
      fetchEvents();
    }
  }, [session, router]);

  // UPDATED: Load albums when event is selected
  useEffect(() => {
    const loadAlbums = async () => {
      if (!selectedEventId) {
        setAlbums([]);
        setSelectedAlbumId('');
        return;
      }

      try {
        const response = await fetch(`/api/events/${selectedEventId}/albums`);
        if (response.ok) {
          const albumsData = await response.json();
          setAlbums(albumsData);
          
          // Auto-select if there's a preselected album
          if (preselectedAlbumId && albumsData.some((a: Album) => a.id === preselectedAlbumId)) {
            setSelectedAlbumId(preselectedAlbumId);
          } else if (albumsData.length === 1) {
            // Auto-select if there's only one album
            setSelectedAlbumId(albumsData[0].id);
          }
        } else {
          console.error('Failed to fetch albums:', response.status);
          setAlbums([]);
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error);
        setAlbums([]);
      }
    };

    loadAlbums();
  }, [selectedEventId, preselectedAlbumId]);

  // UPDATED: Load drive files when album with drive folders is selected
  useEffect(() => {
    const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
    if (selectedAlbum && selectedAlbum.driveFolders.length > 0) {
      setShowDriveSection(true);
      if (driveFiles.length === 0) {
        // Load files from all drive folders in this album
        loadDriveFilesFromAlbum(selectedAlbum);
      }
    } else {
      setShowDriveSection(false);
      setDriveFiles([]);
    }
  }, [selectedAlbumId, albums]);

  // Auto-open file picker or drive section if coming from "Create Album"
  useEffect(() => {
    if (autoStart && selectedAlbumId) {
      const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
      if (selectedAlbum && selectedAlbum.driveFolders.length > 0) {
        setShowDriveSection(true);
        loadDriveFilesFromAlbum(selectedAlbum);
      } else {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 1000);
      }
    }
  }, [autoStart, selectedAlbumId, albums]);

  // UPDATED: Load Drive files from all folders in an album
  const loadDriveFilesFromAlbum = async (album: Album) => {
    setIsDriveLoading(true);
    setDriveError('');

    try {
      console.log('Loading Drive files from album:', album.name);
      
      const allFiles: DriveFile[] = [];
      
      // Load files from each drive folder
      for (const driveFolder of album.driveFolders) {
        try {
          const response = await fetch(`/api/drive/files?folderId=${driveFolder.driveFolderId}`, {
            headers: {
              'Authorization': `Bearer ${(session as any).accessToken}`
            }
          });

          if (response.ok) {
            const files = await response.json();
            console.log(`Loaded ${files.length} files from folder: ${driveFolder.name}`);
            // Add folder info to each file for identification
            const filesWithFolder = files.map((file: DriveFile) => ({
              ...file,
              folderName: driveFolder.name,
              driveFolderId: driveFolder.driveFolderId
            }));
            allFiles.push(...filesWithFolder);
          }
        } catch (error) {
          console.error(`Failed to load files from folder ${driveFolder.name}:`, error);
        }
      }
      
      console.log(`Total files loaded: ${allFiles.length}`);
      setDriveFiles(allFiles);
    } catch (error) {
      console.error('Failed to load Drive files:', error);
      setDriveError(error instanceof Error ? error.message : 'Failed to load files from Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // UPDATED: Process Drive files with new album structure
  const processDriveFiles = async () => {
    if (selectedDriveFiles.size === 0) {
      alert('Please select at least one Drive file to process');
      return;
    }

    if (!selectedAlbumId) {
      alert('Please select an album first');
      return;
    }

    console.log('Processing Drive files:', Array.from(selectedDriveFiles));

    const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
    if (!selectedAlbum || selectedAlbum.driveFolders.length === 0) {
      alert('No drive folders found for this album');
      return;
    }

    try {
      // NEW: Use the proper clustering API format with drive folder IDs
      const clusteringRequest = {
        albums: [{
          album_id: selectedAlbumId,
          folder_id: selectedAlbum.driveFolders.map(df => df.driveFolderId)
        }]
      };

      console.log('Sending clustering request:', clusteringRequest);

      const response = await fetch('/api/photos/cluster', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clusteringRequest)
      });

      if (!response.ok) {
        throw new Error(`Clustering API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Clustering completed:', result);

      alert(`Processing completed! Found ${result.extracted?.length || 0} faces in ${result.centroid?.length || 0} clusters.`);
      
      // Redirect to event view (since persons belong to events now)
      router.push(`/dashboard/${selectedEventId}`);
    } catch (error) {
      console.error('Failed to process Drive files:', error);
      alert('Failed to process files. Please try again.');
    }

    setSelectedDriveFiles(new Set());
  };

  // File handling functions (unchanged)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedAlbumId) {
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
    
    newFiles.forEach(file => {
      simulateFileProcessing(file);
    });

    setProcessingStats(prev => ({
      ...prev,
      total: prev.total + newFiles.length
    }));
  }, [files.length, selectedAlbumId]);

  const simulateFileProcessing = async (file: UploadFile) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'uploading' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 1000));

    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'quality-check' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 1500));

    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'clustering' } : f
    ));
    await new Promise(resolve => setTimeout(resolve, 2000));

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

  // UPDATED: Create event with albums
  const createEvent = async () => {
    if (!newEventName.trim() || !newEventTitle.trim()) return;
    
    try {
      setIsCreatingEvent(true);
      
      // Create albums array if we have album data
      const albums = [];
      if (newAlbumName.trim()) {
        const driveFolders = newAlbumDriveLinks
          .filter(link => link.trim() && validateDriveLink(link))
          .map(driveLink => ({
            name: extractFolderNameFromLink(driveLink) || 'Drive Folder',
            driveLink
          }));
        
        albums.push({
          name: newAlbumName,
          description: '',
          driveFolders
        });
      }

      const eventData = {
        name: newEventName,
        title: newEventTitle,
        description: '',
        albums
      };

      console.log('Creating event:', eventData);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create event error:', errorText);
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const newEvent = await response.json();
      console.log('Event created:', newEvent);
      
      setEvents(prev => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
      
      // Auto-select the created album if any
      if (newEvent.albums && newEvent.albums.length > 0) {
        setSelectedAlbumId(newEvent.albums[0].id);
        setAlbums(newEvent.albums);
      }
      
      // Clear form
      setNewEventName('');
      setNewEventTitle('');
      setNewAlbumName('');
      setNewAlbumDriveLinks(['']);
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // UPDATED: Create album in existing event
  const createAlbum = async () => {
    if (!selectedEventId || !newAlbumName.trim()) return;
    
    try {
      setIsCreatingAlbum(true);
      
      const driveFolders = newAlbumDriveLinks
        .filter(link => link.trim() && validateDriveLink(link))
        .map(driveLink => ({
          name: extractFolderNameFromLink(driveLink) || 'Drive Folder',
          driveLink
        }));

      const albumData = {
        name: newAlbumName,
        description: '',
        driveFolders
      };

      console.log('Creating album:', albumData);

      const response = await fetch(`/api/events/${selectedEventId}/albums`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(albumData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create album error:', errorText);
        throw new Error(`Failed to create album: ${response.status}`);
      }

      const newAlbum = await response.json();
      console.log('Album created:', newAlbum);
      
      setAlbums(prev => [...prev, newAlbum]);
      setSelectedAlbumId(newAlbum.id);
      
      // Clear form
      setNewAlbumName('');
      setNewAlbumDriveLinks(['']);
    } catch (error) {
      console.error('Failed to create album:', error);
      alert('Failed to create album. Please try again.');
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  // Helper functions
  const extractFolderId = (driveLink: string) => {
    const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const extractFolderNameFromLink = (driveLink: string) => {
    // This is a simplified extraction - in reality you might want to call Drive API
    return 'Drive Folder';
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

  // Add drive link input
  const addDriveLink = () => {
    setNewAlbumDriveLinks(prev => [...prev, '']);
  };

  const removeDriveLink = (index: number) => {
    setNewAlbumDriveLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateDriveLink = (index: number, value: string) => {
    setNewAlbumDriveLinks(prev => prev.map((link, i) => i === index ? value : link));
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const selectedAlbum = albums.find(a => a.id === selectedAlbumId);

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading events...</p>
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
        {/* Event & Album Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Event & Album</h2>
          
          <div className="space-y-4">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose existing event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setSelectedAlbumId(''); // Reset album selection
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({event.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Album Selection - Only show if event is selected */}
            {selectedEventId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose album
                </label>
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an album...</option>
                  {albums.map(album => (
                    <option key={album.id} value={album.id}>
                      {album.name}
                      {album.driveFolders.length > 0 && ` (${album.driveFolders.length} Drive folders)`}
                    </option>
                  ))}
                </select>
                
                {selectedAlbum && selectedAlbum.driveFolders.length > 0 && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-sm text-green-800">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      <span>
                        {selectedAlbum.driveFolders.length} Drive folder{selectedAlbum.driveFolders.length > 1 ? 's' : ''} linked
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {selectedAlbum.driveFolders.map((folder, index) => (
                        <div key={index} className="flex items-center justify-between text-xs text-green-700">
                          <span>{folder.name}</span>
                          <a 
                            href={folder.driveLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or create new</span>
              </div>
            </div>

            {/* Create New Event */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">Create New Event</h3>
              <div className="space-y-3">
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
                  placeholder="Event title (e.g., Joren's Wedding)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Optional Album Creation */}
                <div className="border-t pt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Create first album (optional)
                  </label>
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Album name (e.g., Ceremony Photos)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Drive Links */}
                  {newAlbumName && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Google Drive folder links (optional)
                      </label>
                      {newAlbumDriveLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => updateDriveLink(index, e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                              link && !validateDriveLink(link)
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                          {newAlbumDriveLinks.length > 1 && (
                            <button
                              onClick={() => removeDriveLink(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {newAlbumDriveLinks.some(link => link && !validateDriveLink(link)) && (
                        <p className="text-sm text-red-600">Please enter a valid Google Drive folder link</p>
                      )}
                      <button
                        onClick={addDriveLink}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add another folder
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={createEvent}
                  disabled={
                    !newEventName.trim() ||
                    !newEventTitle.trim() ||
                    isCreatingEvent ||
                    (newAlbumDriveLinks.some(link => link.trim()) && 
                     !newAlbumDriveLinks.every(link => !link.trim() || validateDriveLink(link)))
                  }
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isCreatingEvent ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FolderPlus className="w-4 h-4 mr-2" />
                  )}
                  Create Event
                </button>
              </div>
            </div>

            {/* Create New Album in Existing Event */}
            {selectedEventId && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">Create New Album in "{selectedEvent?.title}"</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Album name (e.g., Reception Photos)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Drive Links for New Album */}
                  {newAlbumName && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Google Drive folder links (optional)
                      </label>
                      {newAlbumDriveLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => updateDriveLink(index, e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                              link && !validateDriveLink(link)
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                          {newAlbumDriveLinks.length > 1 && (
                            <button
                              onClick={() => removeDriveLink(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addDriveLink}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add another folder
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={createAlbum}
                    disabled={
                      !newAlbumName.trim() ||
                      isCreatingAlbum ||
                      (newAlbumDriveLinks.some(link => link.trim()) && 
                       !newAlbumDriveLinks.every(link => !link.trim() || validateDriveLink(link)))
                    }
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isCreatingAlbum ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <FolderPlus className="w-4 h-4 mr-2" />
                    )}
                    Create Album
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Google Drive Integration */}
        {showDriveSection && selectedAlbum && selectedAlbum.driveFolders.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CloudDownload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Google Drive Photos</h2>
                <span className="ml-2 text-sm text-gray-500">
                  ({selectedAlbum.driveFolders.length} folder{selectedAlbum.driveFolders.length > 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={() => selectedAlbum && loadDriveFilesFromAlbum(selectedAlbum)}
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedDriveFiles(new Set(driveFiles.map(f => f.id)))}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedDriveFiles(new Set())}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedDriveFiles.size} of {driveFiles.length} files selected
                  </span>
                </div>
                
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
                        <DriveImageWithFallback 
                          file={file}
                          session={session}
                        />
                      </div>
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.size}</p>
                      {(file as any).folderName && (
                        <p className="text-xs text-blue-600 truncate">📁 {(file as any).folderName}</p>
                      )}
                      
                      {selectedDriveFiles.has(file.id) && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle className="w-5 h-5 text-blue-600 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={processDriveFiles}
                    disabled={selectedDriveFiles.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Process Selected Files ({selectedDriveFiles.size})
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No images found in the linked Drive folders
              </div>
            )}
          </div>
        )}

        {/* File Upload Section */}
        {selectedAlbumId && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Direct File Upload</h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-gray-500 mb-4">
                Supports JPG, PNG, GIF, WebP (max 100 files)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-gray-900">
                    Upload Progress ({processingStats.processed}/{processingStats.total})
                  </h3>
                  <div className="text-sm text-gray-500">
                    ✅ {processingStats.successful} success, ❌ {processingStats.failed} failed
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map((file) => (
                    <div key={file.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {getStatusIcon(file.status)}
                        <span className="capitalize">{file.status.replace('-', ' ')}</span>
                        {file.facesDetected && (
                          <span>• {file.facesDetected} faces detected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                Updated: Event → Albums → Drive Folders Structure
              </h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• <strong>Events</strong> contain multiple albums</p>
                <p>• <strong>Albums</strong> can have multiple Google Drive folders</p>
                <p>• <strong>Face clustering</strong> happens at the event level (persons belong to events)</p>
                <p>• <strong>Photos</strong> are organized by album and drive folder</p>
                <p>• Select both event and album before uploading or processing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}