"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";

export default function NewAlbum() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [form, setForm] = useState({
    name: "", // This will be the event name
    title: "", // This will be the album title
    description: "",
    driveLink: "", // Google Drive folder link
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveLinkError, setDriveLinkError] = useState("");

  // Redirect to login if not authenticated
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

  const validateDriveLink = (link: string) => {
    if (!link.trim()) return true; // Optional field
    
    // Check if it's a valid Google Drive folder link
    const drivePatterns = [
      /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/,
      /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/
    ];
    
    return drivePatterns.some(pattern => pattern.test(link));
  };

  const extractFolderId = (driveLink: string) => {
    const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Validate Drive link in real-time
    if (name === 'driveLink') {
      if (value && !validateDriveLink(value)) {
        setDriveLinkError("Please enter a valid Google Drive folder link");
      } else {
        setDriveLinkError("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.title.trim()) {
      alert("Please fill in both event name and title");
      return;
    }

    if (form.driveLink && !validateDriveLink(form.driveLink)) {
      setDriveLinkError("Please enter a valid Google Drive folder link");
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        ...form,
        driveFolderId: form.driveLink ? extractFolderId(form.driveLink) : null,
        userId: session.user?.email // We'll use email as user identifier
      };

      // In real implementation:
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Failed to create album');
      }

      const newEvent = await response.json();
      
      console.log("New album created:", newEvent);
      
      // Redirect to upload page with the new event pre-selected
      router.push(`/upload?eventId=${newEvent.id}&autoStart=true`);
    } catch (error) {
      console.error("Failed to create album:", error);
      alert("Failed to create album. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Album</h1>
              <p className="text-gray-600 mt-1">Set up a new photo album with AI clustering and optional Google Drive integration</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 py-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Event Name Input field */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-gray-700 font-medium mb-2">
              Event Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Wedding Ceremony, Birthday Party, Graduation"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-gray-500 mt-1">This will be used for organizing your photos</p>
          </div>

          {/* Title Input Field */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-gray-700 font-medium mb-2">
              Album Title *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g., Joren's Wedding, My 21st Birthday"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-gray-500 mt-1">A personalized title for this album</p>
          </div>

          {/* Google Drive Link Input Field */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              Google Drive Folder Link (Optional)
            </label>
            <input
              type="url"
              name="driveLink"
              value={form.driveLink}
              onChange={handleChange}
              placeholder="https://drive.google.com/drive/folders/your-folder-id"
              className={`w-full border rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 ${
                driveLinkError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              disabled={isSubmitting}
            />
            {driveLinkError && (
              <p className="text-sm text-red-600 mt-1">{driveLinkError}</p>
            )}
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500">
                Link to a public Google Drive folder containing photos to process
              </p>
              <p className="text-sm text-gray-400 flex items-center">
                <ExternalLink className="w-3 h-3 mr-1" />
                Make sure the folder is publicly accessible or shared with our service
              </p>
            </div>
          </div>

          {/* Description Input field */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-gray-700 font-medium mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Optional description of the event..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500 mt-1">Tell us more about this special event</p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-4 mt-8">
            {/* Cancel Button */}
            <Link
              href="/dashboard"
              className={`px-6 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
            >
              Cancel
            </Link>
            
            {/* Create album button */}
            <button
              type="submit"
              disabled={!form.name.trim() || !form.title.trim() || isSubmitting || !!driveLinkError}
              className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Album...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Album & Continue
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Panel */}
        <div className="max-w-3xl mx-auto mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                <p>Your album will be created with Google Drive integration (if provided)</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                <p>You'll be taken to the upload page to process photos from Drive or upload new ones</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                <p>Each photo will be automatically processed: quality check → face detection → clustering</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</div>
                <p>AI will create person folders automatically, grouping photos by the people in them</p>
              </div>
            </div>
          </div>

          {/* Google Drive Integration Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Google Drive Integration</h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>• Our system can access public Google Drive folders to process photos</p>
              <p>• Photos will be downloaded, processed with AI, and organized automatically</p>
              <p>• Original photos remain in your Drive - we only create organized albums</p>
              <p>• All processing happens securely with your authenticated Google account</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}