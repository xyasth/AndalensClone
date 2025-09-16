// lib/chromadb.ts
import { ChromaClient, Collection } from 'chromadb';
import { ChromaDocument, ChromaQueryResult } from '@/types';

class ChromaDBManager {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMADB_URL || 'http://localhost:8000'
    });
  }

  /**
   * Initialize ChromaDB collection for an event
   */
  async initializeEventCollection(eventId: string): Promise<Collection> {
    try {
      const collectionName = `event_${eventId}`;
      
      // Try to get existing collection first
      try {
        const existingCollection = await this.client.getCollection({
          name: collectionName
        });
        this.collections.set(eventId, existingCollection);
        return existingCollection;
      } catch (error) {
        // Collection doesn't exist, create it
      }

      // Create new collection
      const collection = await this.client.createCollection({
        name: collectionName,
        metadata: {
          event_id: eventId,
          created_at: new Date().toISOString(),
          description: `Face embeddings for event ${eventId}`
        }
      });

      this.collections.set(eventId, collection);
      return collection;
    } catch (error) {
      console.error(`Failed to initialize collection for event ${eventId}:`, error);
      throw new Error(`ChromaDB initialization failed: ${error}`);
    }
  }

  /**
   * Add face embeddings to ChromaDB
   */
  async addFaceEmbeddings(
    eventId: string,
    documents: ChromaDocument[]
  ): Promise<void> {
    try {
      const collection = this.collections.get(eventId) || 
                        await this.initializeEventCollection(eventId);

      const ids = documents.map(doc => doc.id);
      const embeddings = documents.map(doc => doc.embedding);
      const metadatas = documents.map(doc => doc.metadata);
      const docTexts = documents.map(doc => doc.document || doc.id);

      await collection.add({
        ids,
        embeddings,
        metadatas,
        documents: docTexts
      });

      console.log(`Added ${documents.length} face embeddings to event ${eventId}`);
    } catch (error) {
      console.error(`Failed to add embeddings to event ${eventId}:`, error);
      throw new Error(`Failed to add embeddings: ${error}`);
    }
  }

  /**
   * Query similar faces for clustering
   */
  async querySimilarFaces(
    eventId: string,
    queryEmbedding: number[],
    nResults: number = 10,
    threshold: number = 0.8
  ): Promise<ChromaQueryResult> {
    try {
      const collection = this.collections.get(eventId) || 
                        await this.initializeEventCollection(eventId);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        // where: { face_confidence: { $gte: threshold } }
      });

      return results as ChromaQueryResult;
    } catch (error) {
      console.error(`Failed to query similar faces in event ${eventId}:`, error);
      throw new Error(`Failed to query similar faces: ${error}`);
    }
  }

  /**
   * Get all faces in a cluster
   */
  async getFacesInCluster(
    eventId: string,
    clusterId: string
  ): Promise<ChromaQueryResult> {
    try {
      const collection = this.collections.get(eventId) || 
                        await this.initializeEventCollection(eventId);

      const results = await collection.get({
        where: { cluster_id: clusterId }
      });

      const chromaQueryResult: ChromaQueryResult = {
        ids: [results.ids],
        distances: [[]], 
        metadatas: [results.metadatas as (Record<string, any> | null)[]],
        documents: [results.documents as (string | null)[]],
        embeddings: results.embeddings ? [results.embeddings] : null
      };

      return chromaQueryResult;
    } catch (error) {
      console.error(`Failed to get faces in cluster ${clusterId}:`, error);
      throw new Error(`Failed to get cluster faces: ${error}`);
    }
  }

  /**
   * Update face cluster assignment
   */
  async updateFaceCluster(
    eventId: string,
    faceId: string,
    newClusterId: string
  ): Promise<void> {
    try {
      const collection = this.collections.get(eventId) || 
                        await this.initializeEventCollection(eventId);

      await collection.update({
        ids: [faceId],
        metadatas: [{ cluster_id: newClusterId }]
      });

      console.log(`Updated face ${faceId} to cluster ${newClusterId}`);
    } catch (error) {
      console.error(`Failed to update face cluster:`, error);
      throw new Error(`Failed to update face cluster: ${error}`);
    }
  }

  /**
   * Delete event collection
   */
  async deleteEventCollection(eventId: string): Promise<void> {
    try {
      const collectionName = `event_${eventId}`;
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(eventId);
      console.log(`Deleted collection for event ${eventId}`);
    } catch (error) {
      console.error(`Failed to delete collection for event ${eventId}:`, error);
      throw new Error(`Failed to delete collection: ${error}`);
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(eventId: string): Promise<{
    count: number;
    clusters: string[];
    avgConfidence: number;
  }> {
    try {
      const collection = this.collections.get(eventId) || 
                        await this.initializeEventCollection(eventId);

      const results = await collection.get({});
      const count = results.ids.length;
      
      const metadatas = results.metadatas.filter(m => m !== null) as Record<string, any>[];
      const clusters = [...new Set(metadatas.map(m => m.cluster_id))];
      
      const avgConfidence = metadatas.length > 0
        ? metadatas.reduce((sum, m) => sum + (m.face_confidence || 0), 0) / metadatas.length
        : 0;

      return { count, clusters, avgConfidence };
    } catch (error) {
      console.error(`Failed to get collection stats for event ${eventId}:`, error);
      return { count: 0, clusters: [], avgConfidence: 0 };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      console.error('ChromaDB health check failed:', error);
      return false;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      return collections.map(c => c.name);
    } catch (error) {
      console.error('Failed to list collections:', error);
      return [];
    }
  }
}

// Singleton instance
export const chromaDB = new ChromaDBManager();

// Utility functions for clustering
export class FaceClusteringUtils {
  static generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }

  static async performClustering(
    faces: { id: string; embedding: number[]; metadata: any }[],
    threshold: number = 0.8
  ): Promise<Map<string, string[]>> {
    const clusters = new Map<string, string[]>();
    const faceToCluster = new Map<string, string>();

    for (const face of faces) {
      let assignedCluster: string | null = null;
      let maxSimilarity = -1;

      // Check against existing clusters
      for (const [clusterId, faceIds] of clusters.entries()) {
        // Get representative embedding (first face in cluster)
        const representativeFace = faces.find(f => f.id === faceIds[0]);
        if (!representativeFace) continue;

        const similarity = this.calculateSimilarity(
          face.embedding,
          representativeFace.embedding
        );

        if (similarity > threshold && similarity > maxSimilarity) {
          maxSimilarity = similarity;
          assignedCluster = clusterId;
        }
      }

      if (assignedCluster) {
        // Add to existing cluster
        clusters.get(assignedCluster)!.push(face.id);
        faceToCluster.set(face.id, assignedCluster);
      } else {
        // Create new cluster
        const newClusterId = this.generateClusterId();
        clusters.set(newClusterId, [face.id]);
        faceToCluster.set(face.id, newClusterId);
      }
    }

    return clusters;
  }
}