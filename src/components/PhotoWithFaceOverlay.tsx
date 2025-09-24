'use client';

import { useState } from 'react';

const PhotoWithFaceOverlay = ({ photo, person }) => {
  const [imageDimensions, setImageDimensions] = useState(null);

  const handleImageLoad = (e) => {
    const img = e.target;
    setImageDimensions({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
  };

  const personFace = photo.faces.find(face => face.cluster_id === person.cluster_id);

  return (
    <div className="relative break-inside-avoid rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="relative w-full">
        <img
          src={`/api/photos/${photo.id}`}
          alt={photo.originalName}
          className="w-full h-auto object-cover"
          onLoad={handleImageLoad}
          onError={(e) => {
            const target = e.target;
            target.style.display = 'none';
            target.parentElement.innerHTML = `
              <div class="w-full h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                </svg>
              </div>
            `;
          }}
        />

        {/* Face overlay */}
        {personFace && imageDimensions && (
          <div
            className="absolute border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `${(personFace.facial_area.x / imageDimensions.naturalWidth) * 100}%`,
              top: `${(personFace.facial_area.y / imageDimensions.naturalHeight) * 100}%`,
              width: `${(personFace.facial_area.w / imageDimensions.naturalWidth) * 100}%`,
              height: `${(personFace.facial_area.h / imageDimensions.naturalHeight) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Info overlay */}
      <div className="absolute inset-0 hover:bg-black/40 transition-all duration-200 flex items-end">
        <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs font-medium truncate">{photo.originalName}</p>
          <p className="text-xs opacity-75">{new Date(photo.uploadedAt).toLocaleDateString()}</p>
          {personFace && (
            <p className="text-xs opacity-75">
              Confidence: {Math.round(personFace.face_confidence * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Quality dot */}
      <div className="absolute top-2 right-2">
        <div
          className={`w-3 h-3 rounded-full ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'}`}
          title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}
        />
      </div>
    </div>
  );
};

export default PhotoWithFaceOverlay;