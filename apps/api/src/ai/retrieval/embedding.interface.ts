/**
 * Embedding interface abstraction prepared for future vector database integrations (e.g. pgvector, Pinecone).
 */
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
}
