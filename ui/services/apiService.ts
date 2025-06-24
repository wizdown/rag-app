
import { type IngestRequest, type AskRequest, type AskResponse } from '../types';

// Derive API_BASE_URL from process.env.SERVER_URL if available, otherwise default.
// This check ensures it works in browser environments where 'process' might not be defined,
// or where 'process.env.SERVER_URL' isn't specifically set by the build/runtime environment.
const API_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.SERVER_URL)
  ? process.env.SERVER_URL
  : 'http://localhost:8000';

const logRequest = (method: string, url: string, body?: any) => {
  console.log(`[API Request] Method: ${method}, URL: ${url}`, body ? { body } : '');
};

const logResponse = (method: string, url: string, response: Response, responseBodyText: string) => {
  console.log(`[API Response] Method: ${method}, URL: ${url}, Status: ${response.status}, Body: "${responseBodyText.substring(0, 500)}${responseBodyText.length > 500 ? '...' : ''}"`);
};

const logError = (method: string, url: string, error: any, context?: string) => {
  console.error(`[API Error] Method: ${method}, URL: ${url}${context ? `, Context: ${context}` : ''}`, error);
};

export const ingestData = async (collection_name: string, content: string): Promise<void> => {
  const url = `${API_BASE_URL}/ingest`;
  const requestBody: IngestRequest = { collection_name, content };
  logRequest('POST', url, requestBody);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    logError('POST', url, networkError, 'Network error during fetch');
    throw networkError;
  }

  let responseBodyText = '';
  try {
    responseBodyText = await response.text();
  } catch (bodyError) {
    logError('POST', url, bodyError, `Status: ${response.status} - Error reading response body`);
  }
  
  logResponse('POST', url, response, responseBodyText);

  if (!response.ok) {
    let errorMessage = `Failed to ingest data. Status: ${response.status}`;
    if (responseBodyText) {
      try {
        const errorJson = JSON.parse(responseBodyText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (parseError) {
        // Not JSON or invalid JSON. The raw text is already logged.
      }
    }
    logError('POST', url, errorMessage, 'API call failed (response not ok)');
    throw new Error(errorMessage);
  }
  // No specific content expected on success for ingest, just HTTP 200/201
};

export const fetchCollections = async (): Promise<string[]> => {
  const url = `${API_BASE_URL}/collections`;
  logRequest('GET', url);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    logError('GET', url, networkError, 'Network error during fetch');
    throw networkError;
  }

  let responseBodyText = '';
  try {
    responseBodyText = await response.text();
  } catch (bodyError) {
    logError('GET', url, bodyError, `Status: ${response.status} - Error reading response body`);
  }

  logResponse('GET', url, response, responseBodyText);

  if (!response.ok) {
    let errorMessage = `Failed to fetch collections. Status: ${response.status}`;
    if (responseBodyText) {
      try {
        const errorJson = JSON.parse(responseBodyText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (parseError) {
        // Not JSON or invalid JSON.
      }
    }
    logError('GET', url, errorMessage, 'API call failed (response not ok)');
    throw new Error(errorMessage);
  }

  try {
    const collections: string[] = JSON.parse(responseBodyText);
    return collections;
  } catch (parseError) {
    logError('GET', url, parseError, `Failed to parse response body: ${responseBodyText}`);
    throw new Error('Failed to parse collections response.');
  }
};

export const askQuestion = async (collection_name: string, question: string): Promise<AskResponse> => {
  const url = `${API_BASE_URL}/ask`;
  const requestBody: AskRequest = { collection_name, question };
  logRequest('POST', url, requestBody);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    logError('POST', url, networkError, 'Network error during fetch');
    throw networkError;
  }

  let responseBodyText = '';
  try {
    responseBodyText = await response.text();
  } catch (bodyError) {
    logError('POST', url, bodyError, `Status: ${response.status} - Error reading response body`);
  }

  logResponse('POST', url, response, responseBodyText);

  if (!response.ok) {
    let errorMessage = `Failed to ask question. Status: ${response.status}`;
    if (responseBodyText) {
      try {
        const errorJson = JSON.parse(responseBodyText);
        errorMessage = errorJson.detail || errorJson.answer || errorMessage; // Check for 'answer' in error too
      } catch (parseError) {
        // Not JSON or invalid JSON.
      }
    }
    logError('POST', url, errorMessage, 'API call failed (response not ok)');
    throw new Error(errorMessage);
  }

  try {
    const data: AskResponse = JSON.parse(responseBodyText);
    return data;
  } catch (parseError) {
    logError('POST', url, parseError, `Failed to parse response body: ${responseBodyText}`);
    throw new Error('Failed to parse ask question response.');
  }
};

export const deleteCollection = async (collectionName: string): Promise<void> => {
  const url = `${API_BASE_URL}/collections/${collectionName}`;
  logRequest('DELETE', url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
    });
  } catch (networkError) {
    logError('DELETE', url, networkError, 'Network error during fetch');
    throw networkError;
  }

  let responseBodyText = '';
  try {
    // For DELETE 204, body might be empty and .text() is fine.
    responseBodyText = await response.text(); 
  } catch (bodyError) {
     // This catch might be less likely for .text() unless it's a network issue mid-stream
    logError('DELETE', url, bodyError, `Status: ${response.status} - Error reading response body`);
  }

  logResponse('DELETE', url, response, responseBodyText);

  if (response.status === 204) {
    // Successfully deleted, no content expected.
    return;
  }

  if (!response.ok) {
    let errorMessage = `Failed to delete collection "${collectionName}". Status: ${response.status}`;
    if (responseBodyText) {
      try {
        const errorJson = JSON.parse(responseBodyText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (parseError) {
         // Not JSON or invalid. Error message can include raw text if helpful.
         errorMessage = `Failed to delete collection "${collectionName}". Status: ${response.status}. Response: ${responseBodyText.substring(0,100)}`;
      }
    }
    logError('DELETE', url, errorMessage, 'API call failed (response not ok and not 204)');
    throw new Error(errorMessage);
  }
  
  // If response.ok is true but not 204 (e.g. 200 OK after delete), it implies success.
  // The current logic will return void as expected.
  // If specific handling for other 2xx codes is needed, it can be added here.
};
