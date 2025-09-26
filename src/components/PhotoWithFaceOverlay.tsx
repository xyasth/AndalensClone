// Fixed PhotoWithFaceOverlay component
interface PhotoWithFaceOverlayProps {
  photo: Photo;
  person: Person;
}

const PhotoWithFaceOverlay = ({ photo, person }: PhotoWithFaceOverlayProps) => {
  const [imageDimensions, setImageDimensions] = useState<{ naturalWidth: number; naturalHeight: number } | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    console.log('Image loaded:', {
      photoId: photo.id,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
    
    setImageDimensions({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
  };

  // Find faces that belong to this person
  const personFaces = photo.faces?.filter(face => {
    // Try multiple ways to match the face to the person
    return face.personId === person.id || 
           face.clusterId === person.clusterId ||
           face.clusterId === parseInt(person.clusterId);
  }) || [];

  // Enhanced debug logging
  console.log('PhotoWithFaceOverlay Debug:', {
    photoId: photo.id,
    personId: person.id,
    personClusterId: person.clusterId,
    totalFaces: photo.faces?.length || 0,
    personFaces: personFaces.length,
    imageDimensions,
    allFaces: photo.faces?.map(face => ({
      personId: face.personId,
      clusterId: face.clusterId,
      facialArea: {
        x: face.facialAreaX,
        y: face.facialAreaY,
        w: face.facialAreaW,
        h: face.facialAreaH
      }
    })),
    matchingFaces: personFaces.map(face => ({
      x: face.facialAreaX,
      y: face.facialAreaY,
      w: face.facialAreaW,
      h: face.facialAreaH,
      confidence: face.faceConfidence
    }))
  });

  return (
    <div className="relative break-inside-avoid mb-4 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white">
      <div className="relative">
        <img
          src={`/api/photos/${photo.id}`}
          alt={photo.originalName}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
          onLoad={handleImageLoad}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="w-full h-64 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                </svg>
              </div>
            `;
          }}
        />

        {/* Face overlay rectangles - Fixed positioning calculation */}
        {imageDimensions && personFaces.map((face, index) => {
          // Calculate position as percentage of image dimensions
          const leftPercent = (face.facialAreaX / imageDimensions.naturalWidth) * 100;
          const topPercent = (face.facialAreaY / imageDimensions.naturalHeight) * 100;
          const widthPercent = (face.facialAreaW / imageDimensions.naturalWidth) * 100;
          const heightPercent = (face.facialAreaH / imageDimensions.naturalHeight) * 100;

          console.log(`Face ${index} overlay:`, {
            face: {
              x: face.facialAreaX,
              y: face.facialAreaY,
              w: face.facialAreaW,
              h: face.facialAreaH
            },
            image: imageDimensions,
            percentages: {
              left: leftPercent,
              top: topPercent,
              width: widthPercent,
              height: heightPercent
            }
          });

          return (
            <div
              key={index}
              className="absolute border-2 border-white shadow-lg z-40 pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
              }}
            />
          );
        })}

        {/* Debug overlay - shows total face count */}
        {imageDimensions && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {personFaces.length} face{personFaces.length !== 1 ? 's' : ''} of {person.name}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-3 right-3 flex items-center space-x-1">
          <div
            className={`w-4 h-4 rounded-full shadow-lg ${photo.isGoodQuality ? 'bg-green-500' : 'bg-red-500'
              }`}
            title={`Quality Score: ${Math.round(photo.qualityScore * 100)}%`}
          />
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
            {personFaces.length}
          </div>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-semibold text-sm mb-1 truncate">
            {photo.originalName}
          </h3>
          <div className="flex items-center justify-between text-xs opacity-90">
            <span>{photo.faces?.length || 0} total faces</span>
            <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
          </div>
          {imageDimensions && (
            <div className="text-xs opacity-75 mt-1">
              {imageDimensions.naturalWidth} × {imageDimensions.naturalHeight}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};