"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";

export default function NewAlbum() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "", // This will be the event name
    title: "", // This will be the album title (your friend's field)
    description: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.title.trim()) {
      alert("Please fill in both event name and title");
      return;
    }

    setIsSubmitting(true);

    try {
      // In real implementation:
      // const response = await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form)
      // });
      // const newEvent = await response.json();

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newEventId = `event-${Date.now()}`;
      
      console.log("New album created:", form);
      
      // Redirect to upload page with the new event pre-selected
      router.push(`/upload?eventId=${newEventId}&autoStart=true`);
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
              <p className="text-gray-600 mt-1">Set up a new photo album with AI clustering</p>
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

          {/* Title Input Field - Your friend's original field */}
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
              disabled={!form.name.trim() || !form.title.trim() || isSubmitting}
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
                  Create Album & Upload Photos
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
                <p>Your album will be created with the information above</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                <p>You'll be taken to the upload page to add photos (up to 100 at once)</p>
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
        </div>
      </main>
    </div>
  );
}