import { ChromaClient, Collection } from 'chromadb';
import { PhotoMetadata } from '@/types';

class ChromaDBManager {
  private client: ChromaClient;
  private collectionName: string = 'face_embeddings';
  
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMADB_URL || "http://localhost:8000"
    });
  }

  async initializeCollection(): Promise<Collection> {
    try {
      // Create or get existing collection
      const collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 
          description: "Face embeddings for photo clustering",
          version: "1.0"
        }
      });
      return collection;
    } catch (error) {
      console.error('Failed to initialize ChromaDB collection:', error);
      throw error;
    }
  }

  async addFaceEmbedding(metadata: PhotoMetadata) {
    try {
      const collection = await this.initializeCollection();
      
      await collection.add({
        ids: [metadata.foto_id],
        embeddings: [metadata.embedding],
        metadatas: [{
          album_id: metadata.album.id,
          album_name: metadata.album.name,
          event_id: metadata.album.event.id,
          event_name: metadata.album.event.name,
          cluster_id: metadata.cluster_id,
          path: metadata.path,
          facial_area: JSON.stringify(metadata.facial_area),
          face_confidence: metadata.face_confidence
        }],
        documents: [`Face from ${metadata.path} in ${metadata.album.event.name}`]
      });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to add face embedding:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async addMultipleFaceEmbeddings(metadataList: PhotoMetadata[]) {
    try {
      const collection = await this.initializeCollection();
      
      const ids = metadataList.map(m => m.foto_id);
      const embeddings = metadataList.map(m => m.embedding);
      const metadatas = metadataList.map(m => ({
        album_id: m.album.id,
        album_name: m.album.name,
        event_id: m.album.event.id,
        event_name: m.album.event.name,
        cluster_id: m.cluster_id,
        path: m.path,
        facial_area: JSON.stringify(m.facial_area),
        face_confidence: m.face_confidence
      }));
      const documents = metadataList.map(m => 
        `Face from ${m.path} in ${m.album.event.name}`
      );
      
      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents
      });
      
      return { success: true, count: metadataList.length };
    } catch (error) {
      console.error('Failed to add multiple face embeddings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async findSimilarFaces(embedding: number[], threshold: number = 0.8, limit: number = 10) {
    try {
      const collection = await this.initializeCollection();
      
      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: limit
      });
      
      // Filter by similarity threshold if needed
      const filteredResults = results.distances[0]
        .map((distance, index) => ({
          id: results.ids[0][index],
          distance,
          metadata: results.metadatas[0][index],
          similarity: distance !== null ? 1 - distance : 0 // Convert distance to similarity, handle null
        }))
        .filter(result => result.similarity >= threshold);
      
      return { success: true, results: filteredResults };
    } catch (error) {
      console.error('Failed to find similar faces:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async getFacesByCluster(clusterId: string) {
    try {
      const collection = await this.initializeCollection();
      
      const results = await collection.get({
        where: { cluster_id: clusterId }
      });
      
      return { 
        success: true, 
        faces: results.ids.map((id, index) => ({
          id,
          metadata: results.metadatas[index],
          document: results.documents[index]
        }))
      };
    } catch (error) {
      console.error('Failed to get faces by cluster:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async getFacesByEvent(eventId: string) {
    try {
      const collection = await this.initializeCollection();
      
      const results = await collection.get({
        where: { event_id: eventId }
      });
      
      return { 
        success: true, 
        faces: results.ids.map((id, index) => ({
          id,
          metadata: results.metadatas[index],
          document: results.documents[index]
        }))
      };
    } catch (error) {
      console.error('Failed to get faces by event:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async deleteFaceEmbedding(fotoId: string) {
    try {
      const collection = await this.initializeCollection();
      
      await collection.delete({
        ids: [fotoId]
      });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete face embedding:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async getCollectionStats() {
    try {
      const collection = await this.initializeCollection();
      const count = await collection.count();
      
      return { 
        success: true, 
        stats: {
          totalFaces: count,
          collectionName: this.collectionName
        }
      };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}

// Export singleton instance
export const chromaDBManager = new ChromaDBManager();

// Utility functions for easier use
export const addFaceToChroma = async (metadata: PhotoMetadata) => {
  return await chromaDBManager.addFaceEmbedding(metadata);
};

export const addMultipleFacesToChroma = async (metadataList: PhotoMetadata[]) => {
  return await chromaDBManager.addMultipleFaceEmbeddings(metadataList);
};

export const findSimilarFaces = async (embedding: number[], threshold?: number) => {
  return await chromaDBManager.findSimilarFaces(embedding, threshold);
};

export const getFacesByCluster = async (clusterId: string) => {
  return await chromaDBManager.getFacesByCluster(clusterId);
};