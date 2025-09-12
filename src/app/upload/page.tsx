'use client';

import imageCompression from "browser-image-compression";
import { useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload as UploadIcon,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderPlus
} from 'lucide-react';
import { dummyEvents } from '@/lib/dummyData';

interface UploadFile extends File {
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  qualityScore?: number;
}

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId');

  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [newEventName, setNewEventName] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length + files.length > 100) {
      alert('Maximum 100 files allowed per upload');
      return;
    }

    const newFiles: UploadFile[] = acceptedFiles.map(file => {
      const uploadFile = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        preview: URL.createObjectURL(file)
      });
      return uploadFile;
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length]);

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
    if (!newEventName.trim()) return;

    try {
      setIsCreatingEvent(true);
      // In real implementation:
      // const response = await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name: newEventName })
      // });
      // const newEvent = await response.json();

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newEventId = `event-${Date.now()}`;
      setSelectedEventId(newEventId);
      setNewEventName('');
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const simulateQualityCheck = async (file: UploadFile): Promise<{ isGood: boolean; score: number; reason?: string }> => {
    // Simulate quality check API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    // Random quality check result (in real app, this would be AI-powered)
    const score = Math.random();
    const isGood = score > 0.6;

    return {
      isGood,
      score,
      reason: isGood ? undefined : 'Low image quality or no faces detected'
    };
  };

  const uploadFiles = async () => {
    if (!selectedEventId || files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      try {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: "uploading" } : f
        ));

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // ✅ mark as processing (quality check, clustering)
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: "processing" } : f
        ));

        // fake quality check (replace with your API later)
        const qualityResult = await simulateQualityCheck(file);

        if (!qualityResult.isGood) {
          setFiles(prev => prev.map(f =>
            f.id === file.id
              ? { ...f, status: "error", error: qualityResult.reason, qualityScore: qualityResult.score }
              : f
          ));
          continue;
        }

        // ✅ Success
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, status: "completed", qualityScore: qualityResult.score }
            : f
        ));
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: "error", error: "Upload failed" } : f
        ));
      }
    }

    setIsUploading(false);

    const completedFiles = files.filter(f => f.status === "completed");
    if (completedFiles.length > 0) {
      setTimeout(() => {
        router.push(`/events/${selectedEventId}`);
      }, 2000);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Quality check...';
      case 'completed':
        return `Quality: ${(file.qualityScore! * 100).toFixed(0)}%`;
      case 'error':
        return file.error || 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="text-gray-600 mt-1">Upload up to 100 photos for AI-powered face clustering</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Event</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose existing event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an event...</option>
                {dummyEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
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
                Create new event
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="Enter event name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={createEvent}
                  disabled={!newEventName.trim() || isCreatingEvent}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isCreatingEvent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photos</h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
              }`}
          >
            <UploadIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop photos here or click to select
            </p>
            <p className="text-gray-600 mb-4">
              Maximum 100 photos per upload. Supported formats: JPG, PNG, HEIC
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select Photos
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

          <p className="text-sm text-gray-500 mt-2">
            {files.length}/100 photos selected
          </p>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Selected Photos</h2>
              <button
                onClick={() => setFiles([])}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    {/* Status overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      {!isUploading && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(file.status)}
                      <span className="text-xs text-gray-600 ml-1 truncate">
                        {getStatusText(file)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={uploadFiles}
              disabled={!selectedEventId || files.length === 0 || isUploading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Photos...
                </>
              ) : (
                <>
                  <UploadIcon className="w-5 h-5 mr-2" />
                  Upload & Process Photos
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}