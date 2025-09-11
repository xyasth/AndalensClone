// app/events/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FolderPlus, Loader2 } from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    
    try {
      // In real implementation:
      // const response = await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // const newEvent = await response.json();
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newEventId = `event-${Date.now()}`;
      
      // Redirect to upload page with the new event pre-selected
      router.push(`/upload?eventId=${newEventId}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/events"
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
              <p className="text-gray-600 mt-1">Set up a new photo event for AI clustering</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Event Name */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Birthday Party 2024, Wedding Reception, Company Retreat"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Optional description of the event..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/events"
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!formData.name.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your event will be created and ready for photos</li>
            <li>• You'll be redirected to upload photos immediately</li>
            <li>• Each photo will be automatically processed by AI</li>
            <li>• People will be detected and clustered automatically</li>
            <li>• You can view organized results by person and photo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}