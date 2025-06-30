import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthAction {
  type: 'LOGIN_START' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'RESTORE_SESSION';
  payload?: any;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('audit-tool-token'),
  isLoading: false,
  isAuthenticated: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    
    case 'RESTORE_SESSION':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
      };
    
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on app start
  useEffect(() => {
    const token = localStorage.getItem('audit-tool-token');
    if (token) {
      // Verify token with backend
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            dispatch({
              type: 'RESTORE_SESSION',
              payload: { user: data.data.user },
            });
          } else {
            localStorage.removeItem('audit-tool-token');
            dispatch({ type: 'LOGOUT' });
          }
        })
        .catch(() => {
          localStorage.removeItem('audit-tool-token');
          dispatch({ type: 'LOGOUT' });
        });
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('audit-tool-token', data.data.token);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.data.user,
            token: data.data.token,
          },
        });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('audit-tool-token', data.data.token);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.data.user,
            token: data.data.token,
          },
        });
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem('audit-tool-token');
    dispatch({ type: 'LOGOUT' });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    signup,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
export type { User, AuthState }; 