// Enhanced version with caching and batch operations
// Add this to a shared utility file: /lib/driveUtils.ts

interface DriveFile {
  id: string;
  name: string;
  parents?: string[];
}

interface CacheEntry {
  fileId: string;
  timestamp: number;
}

// In-memory cache for file searches (consider using Redis in production)
const fileSearchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Batch cache for folder contents
const folderContentsCache = new Map<string, { files: DriveFile[], timestamp: number }>();

export class DriveFileSearcher {
  constructor(private accessToken: string) {}

  async findFileInFolder(folderId: string, fileName: string): Promise<string | null> {
    const cacheKey = `${folderId}:${fileName}`;
    
    // Check cache first
    const cached = fileSearchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('🎯 Cache hit for file:', fileName);
      return cached.fileId;
    }

    try {
      // Get all files in folder (with caching)
      const folderFiles = await this.getFolderContents(folderId);
      
      // Find the file by exact name match
      const matchingFile = folderFiles.find(file => file.name === fileName);
      
      if (matchingFile) {
        console.log('✅ Found file in folder:', fileName, '->', matchingFile.id);
        
        // Cache the result
        fileSearchCache.set(cacheKey, {
          fileId: matchingFile.id,
          timestamp: Date.now()
        });
        
        return matchingFile.id;
      }

      // If not found in main folder, search subfolders
      const subfolders = folderFiles.filter(file => 
        file.name && !file.name.includes('.') // Simple heuristic for folders
      );

      for (const subfolder of subfolders) {
        console.log('🔍 Searching subfolder:', subfolder.name);
        const fileInSubfolder = await this.findFileInFolder(subfolder.id, fileName);
        
        if (fileInSubfolder) {
          // Cache the result
          fileSearchCache.set(cacheKey, {
            fileId: fileInSubfolder,
            timestamp: Date.now()
          });
          
          return fileInSubfolder;
        }
      }

      console.log('❌ File not found:', fileName);
      return null;

    } catch (error) {
      console.error('Error searching for file:', error);
      return null;
    }
  }

  private async getFolderContents(folderId: string): Promise<DriveFile[]> {
    // Check folder contents cache
    const cached = folderContentsCache.get(folderId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('🎯 Cache hit for folder contents:', folderId);
      return cached.files;
    }

    try {
      // Get all files in the folder in one request
      const query = `'${folderId}' in parents`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents)&pageSize=1000`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Drive API error: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];

      // Cache the folder contents
      folderContentsCache.set(folderId, {
        files,
        timestamp: Date.now()
      });

      console.log(`📁 Loaded ${files.length} items from folder ${folderId}`);
      return files;

    } catch (error) {
      console.error('Error getting folder contents:', error);
      throw error;
    }
  }

  // Method to preload folder contents (call this when user visits album page)
  async preloadFolderContents(folderId: string): Promise<void> {
    try {
      await this.getFolderContents(folderId);
      console.log('📦 Preloaded folder contents for:', folderId);
    } catch (error) {
      console.error('Error preloading folder contents:', error);
    }
  }

  // Clear old cache entries
  static cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of fileSearchCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        fileSearchCache.delete(key);
      }
    }
    
    for (const [key, entry] of folderContentsCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        folderContentsCache.delete(key);
      }
    }
    
    console.log('🧹 Cleaned up old cache entries');
  }
}

// Usage in your photo/thumbnail routes:
export async function findFileInDriveFolder(
  folderId: string, 
  fileName: string, 
  accessToken: string
): Promise<string | null> {
  const searcher = new DriveFileSearcher(accessToken);
  return await searcher.findFileInFolder(folderId, fileName);
}

// Optional: Preload when user visits album page
// Add this to your album detail page API
export async function preloadAlbumFiles(eventId: string, accessToken: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  
  if (event?.driveFolderId) {
    const searcher = new DriveFileSearcher(accessToken);
    await searcher.preloadFolderContents(event.driveFolderId);
  }
}