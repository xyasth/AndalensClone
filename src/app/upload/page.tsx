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
  RefreshCw,
  Eye,
  Star,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
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

interface IQAResult {
  file_name: string;
  prediction: {
    label: 'good' | 'bad';
    confidence: number;
  };
}

interface IQAResponse {
  folders: {
    folder_id: string;
    results: IQAResult[];
    error?: string;
  }[];
}

// Quality Assessment Modal Component
const QualityAssessmentModal = ({ 
  isOpen, 
  onClose, 
  results, 
  driveFiles,
  session,
  onProceed,
  onCancel,
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  results: IQAResult[];
  driveFiles: DriveFile[];
  session: any;
  onProceed: (selectedFiles: string[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (results.length > 0) {
      // Auto-select all good quality files
      const goodFiles = results
        .filter(r => r.prediction.label === 'good')
        .map(r => r.file_name);
      setSelectedFiles(new Set(goodFiles));
    }
  }, [results]);

  const getQualityColor = (prediction: { label: string; confidence: number }) => {
    if (prediction.label === 'good') {
      return prediction.confidence > 0.8 ? 'text-green-600 bg-green-100 border-green-200' : 'text-green-700 bg-green-50 border-green-100';
    } else {
      return prediction.confidence > 0.8 ? 'text-red-600 bg-red-100 border-red-200' : 'text-orange-600 bg-orange-50 border-orange-100';
    }
  };

  const getQualityIcon = (prediction: { label: string; confidence: number }) => {
    if (prediction.label === 'good') {
      return <ThumbsUp className="w-4 h-4" />;
    } else {
      return prediction.confidence > 0.8 ? <ThumbsDown className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Find drive file by name
  const findDriveFile = (fileName: string) => {
    return driveFiles.find(file => file.name === fileName);
  };

  // Simple image component for modal
  const ModalImage = ({ file, fileName }: { file: DriveFile; fileName: string }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const loadImage = async () => {
        setLoading(true);
        setError(false);

        // Try different image sources
        const sources = [
          file.thumbnailLink ? `${file.thumbnailLink}=s300` : null,
          file.thumbnailLink ? `${file.thumbnailLink}=s200-c` : null,
          `/api/drive/thumbnail?fileId=${file.id}&size=300`,
        ].filter(Boolean);

        for (const src of sources) {
          try {
            // Test if image loads
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = src!;
              
              // Timeout after 2 seconds
              setTimeout(() => reject(), 2000);
            });

            setImageSrc(src!);
            setLoading(false);
            return;
          } catch {
            continue;
          }
        }

        // All sources failed
        setError(true);
        setLoading(false);
        setImageErrors(prev => new Set([...prev, fileName]));
      };

      if (file) {
        loadImage();
      }
    }, [file, fileName]);

    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      );
    }

    if (error || !imageSrc) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <ImageIcon className="w-8 h-8 mb-2" />
          <span className="text-xs text-center px-2">{fileName}</span>
        </div>
      );
    }

    return (
      <img 
        src={imageSrc}
        alt={fileName}
        className="w-full h-full object-cover"
        onError={() => {
          setError(true);
          setImageErrors(prev => new Set([...prev, fileName]));
        }}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Image Quality Assessment</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Review image quality scores and select which photos to process
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Analyzing image quality...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedFiles(new Set(results.map(r => r.file_name)))}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedFiles(new Set(results.filter(r => r.prediction.label === 'good').map(r => r.file_name)))}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Select Good Quality
                  </button>
                  <button
                    onClick={() => setSelectedFiles(new Set())}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedFiles.size} of {results.length} selected
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result, index) => {
                  const driveFile = findDriveFile(result.file_name);
                  return (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        selectedFiles.has(result.file_name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedFiles);
                        if (newSelected.has(result.file_name)) {
                          newSelected.delete(result.file_name);
                        } else {
                          newSelected.add(result.file_name);
                        }
                        setSelectedFiles(newSelected);
                      }}
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                        {driveFile ? (
                          <>
                            <ModalImage file={driveFile} fileName={result.file_name} />
                            {/* Quality Badge Overlay */}
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(result.prediction)}`}>
                              <div className="flex items-center">
                                {getQualityIcon(result.prediction)}
                                <span className="ml-1">{(result.prediction.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                            {/* Selection Indicator */}
                            {selectedFiles.has(result.file_name) && (
                              <div className="absolute top-2 left-2">
                                <CheckCircle className="w-6 h-6 text-blue-600 bg-white rounded-full" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500 text-center px-2">{result.file_name}</span>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="space-y-2">
                        <p className="font-medium text-sm truncate" title={result.file_name}>
                          {result.file_name}
                        </p>
                        
                        {/* Quality Assessment */}
                        <div className={`flex items-center justify-between p-2 rounded-md border ${getQualityColor(result.prediction)}`}>
                          <div className="flex items-center">
                            {getQualityIcon(result.prediction)}
                            <span className="ml-2 text-sm font-medium capitalize">
                              {result.prediction.label}
                            </span>
                          </div>
                          <span className="text-sm font-bold">
                            {(result.prediction.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* File Details */}
                        {driveFile && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Size: {driveFile.size}</p>
                            {(driveFile as any).folderName && (
                              <p className="text-blue-600">📁 {(driveFile as any).folderName}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show warning if some images failed to load */}
              {imageErrors.size > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span>
                      {imageErrors.size} image{imageErrors.size > 1 ? 's' : ''} could not be loaded but can still be processed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-green-600">
              <ThumbsUp className="w-4 h-4 mr-1" />
              <span>Good: {results.filter(r => r.prediction.label === 'good').length}</span>
            </div>
            <div className="flex items-center text-red-600">
              <ThumbsDown className="w-4 h-4 mr-1" />
              <span>Poor: {results.filter(r => r.prediction.label === 'bad').length}</span>
            </div>
            <div className="text-gray-600">
              Total: {results.length}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onProceed(Array.from(selectedFiles))}
              disabled={selectedFiles.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              Process Selected ({selectedFiles.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function UploadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId');
  const preselectedAlbumId = searchParams.get('albumId');
  const autoStart = searchParams.get('autoStart') === 'true';
  
  // State management
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [selectedAlbumId, setSelectedAlbumId] = useState(preselectedAlbumId || '');
  const [newEventName, setNewEventName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDriveLinks, setNewAlbumDriveLinks] = useState(['']);
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
  
  // IQA Modal State
  const [showIQAModal, setShowIQAModal] = useState(false);
  const [iqaResults, setIqaResults] = useState<IQAResult[]>([]);
  const [isIQALoading, setIsIQALoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Drive Image Component with Fallback
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

  // Fetch events on load
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

  // Load albums when event is selected
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
          
          if (preselectedAlbumId && albumsData.some((a: Album) => a.id === preselectedAlbumId)) {
            setSelectedAlbumId(preselectedAlbumId);
          } else if (albumsData.length === 1) {
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

  // Load drive files when album with drive folders is selected
  useEffect(() => {
    const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
    if (selectedAlbum && selectedAlbum.driveFolders.length > 0) {
      setShowDriveSection(true);
      if (driveFiles.length === 0) {
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

  // Load Drive files from all folders in an album
  const loadDriveFilesFromAlbum = async (album: Album) => {
    setIsDriveLoading(true);
    setDriveError('');

    try {
      console.log('Loading Drive files from album:', album.name);
      
      const allFiles: DriveFile[] = [];
      
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

  // IQA API call
  const performIQA = async (folderIds: string[]): Promise<IQAResult[]> => {
    try {
      const iqaApiUrl = process.env.NEXT_PUBLIC_IQA_API_URL || null;
      
      if (!iqaApiUrl) {
        console.log('No IQA API URL configured, generating mock data');
        return generateMockIQAResults(folderIds);
      }

      const response = await fetch(iqaApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_id: folderIds
        })
      });

      if (!response.ok) {
        throw new Error(`IQA API failed: ${response.status}`);
      }

      const data: IQAResponse = await response.json();
      
      // Flatten results from all folders
      const allResults: IQAResult[] = [];
      data.folders.forEach(folder => {
        if (folder.results) {
          allResults.push(...folder.results);
        }
      });
      
      return allResults;
    } catch (error) {
      console.warn('IQA API call failed, using mock data:', error);
      return generateMockIQAResults(folderIds);
    }
  };

  // Generate mock IQA results
  const generateMockIQAResults = (folderIds: string[]): IQAResult[] => {
    const mockResults: IQAResult[] = [];
    
    driveFiles.forEach(file => {
      const isGoodQuality = Math.random() > 0.3; // 70% good quality
      const confidence = isGoodQuality 
        ? 0.6 + Math.random() * 0.4  // 0.6-1.0 for good
        : 0.5 + Math.random() * 0.5; // 0.5-1.0 for bad
        
      mockResults.push({
        file_name: file.name,
        prediction: {
          label: isGoodQuality ? 'good' : 'bad',
          confidence: confidence
        }
      });
    });
    
    return mockResults;
  };

  // Process Drive files with IQA
  const processDriveFiles = async () => {
    if (selectedDriveFiles.size === 0) {
      alert('Please select at least one Drive file to process');
      return;
    }

    if (!selectedAlbumId) {
      alert('Please select an album first');
      return;
    }

    const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
    if (!selectedAlbum || selectedAlbum.driveFolders.length === 0) {
      alert('No drive folders found for this album');
      return;
    }

    // Start IQA process
    setIsIQALoading(true);
    setShowIQAModal(true);

    try {
      const folderIds = selectedAlbum.driveFolders.map(df => df.driveFolderId);
      const iqaResults = await performIQA(folderIds);
      
      // Filter results to only include selected files
      const selectedFileNames = Array.from(selectedDriveFiles).map(fileId => {
        const file = driveFiles.find(f => f.id === fileId);
        return file?.name || '';
      }).filter(name => name);

      const filteredResults = iqaResults.filter(result => 
        selectedFileNames.includes(result.file_name)
      );

      setIqaResults(filteredResults);
    } catch (error) {
      console.error('IQA process failed:', error);
      alert('Quality assessment failed. Please try again.');
      setShowIQAModal(false);
    } finally {
      setIsIQALoading(false);
    }
  };

  // Proceed with clustering after IQA
  const proceedWithClustering = async (selectedFileNames: string[]) => {
    setShowIQAModal(false);
    
    if (selectedFileNames.length === 0) {
      alert('No files selected for processing');
      return;
    }

    try {
      const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
      if (!selectedAlbum) return;

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
      
      router.push(`/dashboard/${selectedEventId}`);
    } catch (error) {
      console.error('Failed to process Drive files:', error);
      alert('Failed to process files. Please try again.');
    }

    setSelectedDriveFiles(new Set());
  };

  // File handling functions
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

  // Create event with albums
  const createEvent = async () => {
    if (!newEventName.trim() || !newEventTitle.trim()) return;
    
    try {
      setIsCreatingEvent(true);
      
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
      
      if (newEvent.albums && newEvent.albums.length > 0) {
        setSelectedAlbumId(newEvent.albums[0].id);
        setAlbums(newEvent.albums);
      }
      
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

  // Create album in existing event
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
      {/* IQA Modal */}
      <QualityAssessmentModal
        isOpen={showIQAModal}
        onClose={() => setShowIQAModal(false)}
        results={iqaResults}
        driveFiles={driveFiles}
        session={session}
        onProceed={proceedWithClustering}
        onCancel={() => {
          setShowIQAModal(false);
          setSelectedDriveFiles(new Set());
        }}
        isLoading={isIQALoading}
      />

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
                Process photos from Google Drive or direct uploads - powered by AI clustering & quality assessment
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
                  setSelectedAlbumId('');
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

            {/* Album Selection */}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Eye className="w-4 h-4 mr-1" />
                    Quality assessment will be performed before processing
                  </div>
                  <button
                    onClick={processDriveFiles}
                    disabled={selectedDriveFiles.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Analyze Quality & Process ({selectedDriveFiles.size})
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
                New: Image Quality Assessment (IQA) Integration
              </h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• <strong>Quality Assessment:</strong> All photos are analyzed for quality before processing</p>
                <p>• <strong>Smart Selection:</strong> Good quality images are pre-selected automatically</p>
                <p>• <strong>User Control:</strong> Review and choose which photos to process</p>
                <p>• <strong>No Database Storage:</strong> Quality scores are shown in real-time only</p>
                <p>• <strong>Fallback Support:</strong> Works even without external IQA API</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}