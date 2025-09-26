import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  clusterId: string; // Fixed: should be string, not number
  photoCount: number;
  averageConfidence: number;
  thumbnailPath?: string;
}

interface ProperFaceCropProps {
  person: Person;
  className?: string;
}

const ProperFaceCrop = ({ person, className = '' }: ProperFaceCropProps) => {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    cropImage();
  }, [person.thumbnailPath]);

  const cropImage = async () => {
    if (!person.thumbnailPath) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      // Parse crop data from thumbnailPath
      const url = new URL(person.thumbnailPath, window.location.origin);
      const pathParts = url.pathname.split('/');
      const photoId = pathParts[3];

      const x = parseInt(url.searchParams.get('x') || '0');
      const y = parseInt(url.searchParams.get('y') || '0');
      const w = parseInt(url.searchParams.get('w') || '100');
      const h = parseInt(url.searchParams.get('h') || '100');

      console.log('🔍 Cropping image for', person.name, { photoId, x, y, w, h });

      // Load the full image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          console.log('🖼️ Image loaded successfully for', person.name,
            'Size:', img.naturalWidth, 'x', img.naturalHeight);

          // Create a new canvas element directly
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.error('❌ Canvas context not available for', person.name);
            setError(true);
            setLoading(false);
            return;
          }

          // Set canvas to square size
          const size = 200;
          canvas.width = size;
          canvas.height = size;

          // Clear canvas
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 0, size, size);

          // Calculate crop with some padding
          const padding = Math.min(w, h) * 0.1; // 10% padding
          const cropX = Math.max(0, x - padding);
          const cropY = Math.max(0, y - padding);
          const cropW = Math.min(img.naturalWidth - cropX, w + padding * 2);
          const cropH = Math.min(img.naturalHeight - cropY, h + padding * 2);

          console.log('✂️ Cropping for', person.name, ':', {
            original: { x, y, w, h },
            withPadding: { cropX, cropY, cropW, cropH },
            imageSize: { width: img.naturalWidth, height: img.naturalHeight }
          });

          // Draw cropped and scaled image
          ctx.drawImage(
            img,
            cropX, cropY, cropW, cropH, // Source crop area
            0, 0, size, size             // Destination
          );

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCroppedImage(dataUrl);
          setLoading(false);

          console.log('✅ Cropped image created for', person.name);
        } catch (err) {
          console.error('❌ Canvas error for', person.name, err);
          setError(true);
          setLoading(false);
        }
      };

      img.onerror = (e) => {
        console.error('❌ Failed to load image for', person.name, 'Event:', e);
        console.error('❌ Image URL was:', `/api/photos/${photoId}`);
        setError(true);
        setLoading(false);
      };

      img.src = `/api/photos/${photoId}`;
    } catch (err) {
      console.error('❌ Error parsing thumbnail path for', person.name, err);
      setError(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`aspect-square bg-gray-200 rounded-full animate-pulse flex items-center justify-center ${className}`}>
        <User className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  if (error || !croppedImage) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center ${className}`}>
        <User className="w-8 h-8 text-white" />
      </div>
    );
  }

  return (
    <div className={`aspect-square rounded-full overflow-hidden bg-gray-100 ${className}`}>
      <img
        src={croppedImage}
        alt={person.name}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// Person Card component - Fixed for both dashboard and event detail usage
interface PersonCardProps {
  person: Person;
  onClick: () => void;
}

const PersonCard = ({ person, onClick }: PersonCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300"
    >
      <div className="mb-3 flex justify-center">
        <ProperFaceCrop
          person={person}
          className="w-20 h-20"
        />
      </div>

      <div className="text-center">
        <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors">
          {person.name}
        </h3>
        <p className="text-xs text-gray-500">
          {person.photoCount} photos
        </p>
        <div className="flex items-center justify-center text-xs text-gray-500 mt-1">
          <div className={`w-2 h-2 rounded-full mr-1 ${person.averageConfidence > 0.8 ? 'bg-green-400' :
              person.averageConfidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
          {Math.round(person.averageConfidence * 100)}% confidence
        </div>
      </div>
    </div>
  );
};

// Alternative PersonCard for event detail page with larger styling
interface EventPersonCardProps {
  person: Person;
  onClick: () => void;
}

const EventPersonCard = ({ person, onClick }: EventPersonCardProps) => (
  <div
    onClick={onClick}
    className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
  >
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden">
        {person.thumbnailPath ? (
          <ProperFaceCrop
            person={person}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
        {person.name}
      </h3>
      <p className="text-sm text-gray-600 mb-2">{person.photoCount} photos</p>
      <div className="flex items-center justify-center text-xs text-gray-500">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-1 ${person.averageConfidence > 0.8 ? 'bg-green-400' :
              person.averageConfidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
          {Math.round(person.averageConfidence * 100)}% confidence
        </div>
      </div>
    </div>
  </div>
);

export { PersonCard, EventPersonCard, ProperFaceCrop };
export default PersonCard;