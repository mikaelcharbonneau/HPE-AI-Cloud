import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface ApiContextType {
  request: <T = any>(endpoint: string, options?: ApiRequestOptions) => Promise<T>;
  get: <T = any>(endpoint: string) => Promise<T>;
  post: <T = any>(endpoint: string, body?: any) => Promise<T>;
  put: <T = any>(endpoint: string, body?: any) => Promise<T>;
  delete: <T = any>(endpoint: string) => Promise<T>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const { token, logout } = useAuth();
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const request = async <T = any,>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Add authorization header if token exists
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      
      // Handle authentication errors
      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  const get = <T = any,>(endpoint: string): Promise<T> =>
    request<T>(endpoint, { method: 'GET' });

  const post = <T = any,>(endpoint: string, body?: any): Promise<T> =>
    request<T>(endpoint, { method: 'POST', body });

  const put = <T = any,>(endpoint: string, body?: any): Promise<T> =>
    request<T>(endpoint, { method: 'PUT', body });

  const deleteRequest = <T = any,>(endpoint: string): Promise<T> =>
    request<T>(endpoint, { method: 'DELETE' });

  const contextValue: ApiContextType = {
    request,
    get,
    post,
    put,
    delete: deleteRequest,
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi(): ApiContextType {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}

export { ApiContext }; 