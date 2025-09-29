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
  Loader2,
  FolderPlus,
  Brain,
  ArrowLeft,
  Link as LinkIcon,
  ExternalLink,
  CloudDownload,
  RefreshCw,
  Eye,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Event, Album, DriveFile, IQAResult, IQAFolderResult } from '@/types';

interface DriveFileWithFolder extends DriveFile {
  folderName: string;
  driveFolderId: string;
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
  results: IQAFolderResult[];
  driveFiles: DriveFileWithFolder[];
  session: any;
  onProceed: (selectedFiles: Map<string, string[]>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Map<string, Set<string>>>(new Map());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (results.length > 0) {
      const goodFilesByFolder = new Map<string, Set<string>>();
      
      results.forEach(folderResult => {
        const goodFiles = folderResult.results
          .filter(r => r.prediction.label === 'good')
          .map(r => r.file_name);
        
        if (goodFiles.length > 0) {
          goodFilesByFolder.set(folderResult.folder_id, new Set(goodFiles));
        }
      });
      
      setSelectedFiles(goodFilesByFolder);
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

  const findDriveFile = (fileName: string, folderId: string) => {
    return driveFiles.find(file => file.name === fileName && file.driveFolderId === folderId);
  };

  const toggleFileSelection = (folderId: string, fileName: string) => {
    const newSelected = new Map(selectedFiles);
    const folderFiles = newSelected.get(folderId) || new Set();
    
    if (folderFiles.has(fileName)) {
      folderFiles.delete(fileName);
    } else {
      folderFiles.add(fileName);
    }
    
    if (folderFiles.size === 0) {
      newSelected.delete(folderId);
    } else {
      newSelected.set(folderId, folderFiles);
    }
    
    setSelectedFiles(newSelected);
  };

  const getTotalSelectedCount = () => {
    let total = 0;
    selectedFiles.forEach(files => total += files.size);
    return total;
  };

  const getTotalFilesCount = () => {
    return results.reduce((sum, folder) => sum + folder.results.length, 0);
  };

  const ModalImage = ({ file, fileName }: { file: DriveFileWithFolder; fileName: string }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const loadImage = async () => {
        setLoading(true);
        setError(false);

        const sources = [
          file.thumbnailLink ? `${file.thumbnailLink}=s300` : null,
          file.thumbnailLink ? `${file.thumbnailLink}=s200-c` : null,
          `/api/drive/thumbnail?fileId=${file.id}&size=300`,
        ].filter(Boolean);

        for (const src of sources) {
          try {
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = src!;
              setTimeout(() => reject(), 2000);
            });

            setImageSrc(src!);
            setLoading(false);
            return;
          } catch {
            continue;
          }
        }

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
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const allSelected = new Map<string, Set<string>>();
                      results.forEach(folder => {
                        allSelected.set(folder.folder_id, new Set(folder.results.map(r => r.file_name)));
                      });
                      setSelectedFiles(allSelected);
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => {
                      const goodFiles = new Map<string, Set<string>>();
                      results.forEach(folder => {
                        const good = folder.results
                          .filter(r => r.prediction.label === 'good')
                          .map(r => r.file_name);
                        if (good.length > 0) {
                          goodFiles.set(folder.folder_id, new Set(good));
                        }
                      });
                      setSelectedFiles(goodFiles);
                    }}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Select Good Quality
                  </button>
                  <button
                    onClick={() => setSelectedFiles(new Map())}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
                <span className="text-sm text-gray-600">
                  {getTotalSelectedCount()} of {getTotalFilesCount()} selected
                </span>
              </div>

              {results.map((folderResult, folderIndex) => (
                <div key={folderIndex} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Folder ID: {folderResult.folder_id}
                    <span className="ml-2 text-sm text-gray-500">
                      ({selectedFiles.get(folderResult.folder_id)?.size || 0} / {folderResult.results.length} selected)
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {folderResult.results.map((result, index) => {
                      const driveFile = findDriveFile(result.file_name, folderResult.folder_id);
                      const isSelected = selectedFiles.get(folderResult.folder_id)?.has(result.file_name) || false;
                      
                      return (
                        <div
                          key={index}
                          className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleFileSelection(folderResult.folder_id, result.file_name)}
                        >
                          <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-3 relative">
                            {driveFile ? (
                              <>
                                <ModalImage file={driveFile} fileName={result.file_name} />
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(result.prediction)}`}>
                                  <div className="flex items-center">
                                    {getQualityIcon(result.prediction)}
                                    <span className="ml-1">{(result.prediction.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                                {isSelected && (
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

                          <div className="space-y-2">
                            <p className="font-medium text-sm truncate" title={result.file_name}>
                              {result.file_name}
                            </p>
                            
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

                            {driveFile && (
                              <div className="text-xs text-gray-500">
                                <p>Size: {driveFile.size}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

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
              <span>Good: {results.reduce((sum, f) => sum + f.results.filter(r => r.prediction.label === 'good').length, 0)}</span>
            </div>
            <div className="flex items-center text-red-600">
              <ThumbsDown className="w-4 h-4 mr-1" />
              <span>Poor: {results.reduce((sum, f) => sum + f.results.filter(r => r.prediction.label === 'bad').length, 0)}</span>
            </div>
            <div className="text-gray-600">
              Total: {getTotalFilesCount()}
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
              onClick={() => {
                const selectedMap = new Map<string, string[]>();
                selectedFiles.forEach((files, folderId) => {
                  selectedMap.set(folderId, Array.from(files));
                });
                onProceed(selectedMap);
              }}
              disabled={getTotalSelectedCount() === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              Process Selected ({getTotalSelectedCount()})
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
  
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [selectedAlbumId, setSelectedAlbumId] = useState(preselectedAlbumId || '');
  const [newEventName, setNewEventName] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDriveLinks, setNewAlbumDriveLinks] = useState(['']);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  const [driveFiles, setDriveFiles] = useState<DriveFileWithFolder[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [showDriveSection, setShowDriveSection] = useState(false);
  
  const [showIQAModal, setShowIQAModal] = useState(false);
  const [iqaResults, setIqaResults] = useState<IQAFolderResult[]>([]);
  const [isIQALoading, setIsIQALoading] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const eventsData = await response.json();
          setEvents(eventsData);
        } else if (response.status === 401) {
          router.push('/auth/signin');
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
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error);
      }
    };

    loadAlbums();
  }, [selectedEventId, preselectedAlbumId]);

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

  const loadDriveFilesFromAlbum = async (album: Album) => {
    setIsDriveLoading(true);
    setDriveError('');

    try {
      const allFiles: DriveFileWithFolder[] = [];
      
      for (const driveFolder of album.driveFolders) {
        try {
          const response = await fetch(`/api/drive/files?folderId=${driveFolder.driveFolderId}`, {
            headers: {
              'Authorization': `Bearer ${(session as any).accessToken}`
            }
          });

          if (response.ok) {
            const files = await response.json();
            const filesWithFolder: DriveFileWithFolder[] = files.map((file: DriveFile) => ({
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
      
      setDriveFiles(allFiles);
    } catch (error) {
      console.error('Failed to load Drive files:', error);
      setDriveError(error instanceof Error ? error.message : 'Failed to load files from Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const processDriveFiles = async () => {
    if (!selectedAlbumId) {
      alert('Please select an album first');
      return;
    }

    const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
    if (!selectedAlbum || selectedAlbum.driveFolders.length === 0) {
      alert('No drive folders found for this album');
      return;
    }

    setIsIQALoading(true);
    setShowIQAModal(true);

    try {
      const folderIds = selectedAlbum.driveFolders.map(df => df.driveFolderId);
      
      console.log('🔍 Calling IQA API with folder IDs:', folderIds);
      
      const response = await fetch('/api/photos/iqa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderIds })
      });

      if (!response.ok) {
        throw new Error(`IQA API failed: ${response.status}`);
      }

      const iqaData = await response.json();
      console.log('✅ IQA API response:', iqaData);
      
      setIqaResults(iqaData.folders || []);
    } catch (error) {
      console.error('❌ IQA process failed:', error);
      alert('Quality assessment failed. Please try again.');
      setShowIQAModal(false);
    } finally {
      setIsIQALoading(false);
    }
  };

  const proceedWithClustering = async (selectedFilesByFolder: Map<string, string[]>) => {
    setShowIQAModal(false);
    
    if (selectedFilesByFolder.size === 0) {
      alert('No files selected for processing');
      return;
    }

    try {
      const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
      if (!selectedAlbum) return;

      // Build the folder_id and include_files arrays in matching order
      const folderIds: string[] = [];
      const includeFiles: string[][] = [];
      
      // Use the album's drive folders order to maintain consistency
      for (const driveFolder of selectedAlbum.driveFolders) {
        const folderId = driveFolder.driveFolderId;
        const filesForFolder = selectedFilesByFolder.get(folderId) || [];
        
        // Only include folders that have selected files
        if (filesForFolder.length > 0) {
          folderIds.push(folderId);
          includeFiles.push(filesForFolder);
        }
      }

      const clusteringRequest = {
        albums: [{
          album_id: selectedAlbumId,
          folder_id: folderIds,
          include_files: includeFiles
        }]
      };

      console.log('📤 Sending clustering request:', JSON.stringify(clusteringRequest, null, 2));

      const response = await fetch('/api/photos/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clusteringRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Clustering API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Clustering completed:', result);

      alert(`Processing completed! Found ${result.extracted?.length || 0} faces in ${result.centroid?.length || 0} clusters.`);
      
      router.push(`/dashboard/${selectedEventId}`);
    } catch (error) {
      console.error('❌ Failed to process Drive files:', error);
      alert(`Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName,
          title: newEventTitle,
          description: '',
          albums
        })
      });

      if (!response.ok) throw new Error(`Failed to create event: ${response.status}`);

      const newEvent = await response.json();
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

      const response = await fetch(`/api/events/${selectedEventId}/albums`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAlbumName,
          description: '',
          driveFolders
        })
      });

      if (!response.ok) throw new Error(`Failed to create album: ${response.status}`);

      const newAlbum = await response.json();
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

  const extractFolderNameFromLink = (driveLink: string) => 'Drive Folder';
  
  const validateDriveLink = (link: string) => {
    if (!link.trim()) return true;
    const drivePatterns = [
      /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/,
      /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/
    ];
    return drivePatterns.some(pattern => pattern.test(link));
  };

  const addDriveLink = () => setNewAlbumDriveLinks(prev => [...prev, '']);
  const removeDriveLink = (index: number) => setNewAlbumDriveLinks(prev => prev.filter((_, i) => i !== index));
  const updateDriveLink = (index: number, value: string) => setNewAlbumDriveLinks(prev => prev.map((link, i) => i === index ? value : link));

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const selectedAlbum = albums.find(a => a.id === selectedAlbumId);

  if (status === "loading" || eventsLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <QualityAssessmentModal
        isOpen={showIQAModal}
        onClose={() => setShowIQAModal(false)}
        results={iqaResults}
        driveFiles={driveFiles}
        session={session}
        onProceed={proceedWithClustering}
        onCancel={() => setShowIQAModal(false)}
        isLoading={isIQALoading}
      />

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload & Auto-Process Photos</h1>
              <p className="text-gray-600 mt-1">
                Process photos from Google Drive with AI clustering & quality assessment
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose existing event</label>
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
                  <option key={event.id} value={event.id}>{event.title} ({event.name})</option>
                ))}
              </select>
            </div>

            {selectedEventId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose album</label>
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an album...</option>
                  {albums.map(album => (
                    <option key={album.id} value={album.id}>
                      {album.name} {album.driveFolders.length > 0 && `(${album.driveFolders.length} folders)`}
                    </option>
                  ))}
                </select>
                
                {selectedAlbum && selectedAlbum.driveFolders.length > 0 && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-sm text-green-800">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      <span>{selectedAlbum.driveFolders.length} Drive folder{selectedAlbum.driveFolders.length > 1 ? 's' : ''} linked</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {selectedAlbum.driveFolders.map((folder, index) => (
                        <div key={index} className="flex items-center justify-between text-xs text-green-700">
                          <span>{folder.name}</span>
                          <a href={folder.driveLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
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

            {/* Create Event Section */}
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
                
                {newEventName && newEventTitle && (
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Create first album (optional)</label>
                    <input
                      type="text"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="Album name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {newAlbumName && (
                      <div className="mt-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Google Drive folder links</label>
                        {newAlbumDriveLinks.map((link, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="url"
                              value={link}
                              onChange={(e) => updateDriveLink(index, e.target.value)}
                              placeholder="https://drive.google.com/drive/folders/..."
                              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                                link && !validateDriveLink(link) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            />
                            {newAlbumDriveLinks.length > 1 && (
                              <button onClick={() => removeDriveLink(index)} className="px-3 py-2 text-red-600 hover:text-red-700">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={addDriveLink} className="text-sm text-blue-600 hover:text-blue-700">
                          + Add another folder
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={createEvent}
                  disabled={!newEventName.trim() || !newEventTitle.trim() || isCreatingEvent}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isCreatingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FolderPlus className="w-4 h-4 mr-2" />}
                  Create Event
                </button>
              </div>
            </div>

            {/* Create Album Section */}
            {selectedEventId && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">Create New Album in "{selectedEvent?.title}"</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Album name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {newAlbumName && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Google Drive folder links</label>
                      {newAlbumDriveLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => updateDriveLink(index, e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                              link && !validateDriveLink(link) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                          {newAlbumDriveLinks.length > 1 && (
                            <button onClick={() => removeDriveLink(index)} className="px-3 py-2 text-red-600 hover:text-red-700">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addDriveLink} className="text-sm text-blue-600 hover:text-blue-700">
                        + Add another folder
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={createAlbum}
                    disabled={!newAlbumName.trim() || isCreatingAlbum}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isCreatingAlbum ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FolderPlus className="w-4 h-4 mr-2" />}
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
                <span className="ml-2 text-sm text-gray-500">({selectedAlbum.driveFolders.length} folder{selectedAlbum.driveFolders.length > 1 ? 's' : ''})</span>
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
              </div>
            )}

            {isDriveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading files from Google Drive...</span>
              </div>
            ) : driveFiles.length > 0 ? (
              <>
                <div className="text-center py-4 mb-4">
                  <p className="text-gray-600 mb-4">Ready to analyze {driveFiles.length} photos from {selectedAlbum.driveFolders.length} folder{selectedAlbum.driveFolders.length > 1 ? 's' : ''}</p>
                  <button
                    onClick={processDriveFiles}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Start Quality Assessment & Processing
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">No images found in the linked Drive folders</div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Brain className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Image Quality Assessment (IQA) Integration</h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• All photos are analyzed for quality before processing</p>
                <p>• Good quality images are pre-selected automatically</p>
                <p>• Review and choose which photos to process</p>
                <p>• Quality scores shown in real-time only (not stored)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}