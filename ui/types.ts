
export interface Collection {
  name: string;
}

export interface IngestRequest {
  collection_name: string;
  content: string;
}

// Assuming a simple success message or error for ingest
// No specific response structure given for ingest success beyond HTTP 200
// export interface IngestResponse {} 

export interface AskRequest {
  collection_name: string;
  question: string;
}

export interface AskResponse {
  answer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  collectionName?: string;
  timestamp: Date;
  responseTimeSeconds?: number; // Added to store API response time
}

export enum ViewMode {
  AddCollection = 'addCollection',
  AskQuestion = 'askQuestion',
}