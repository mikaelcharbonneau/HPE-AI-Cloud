import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Grommet } from 'grommet';
import { hpe } from 'grommet-theme-hpe';
import './App.css';

// Import components (we'll create these next)
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AuditsList from './pages/AuditsList';
import AuditDetail from './pages/AuditDetail';
import NewAudit from './pages/NewAudit';
import IncidentsList from './pages/IncidentsList';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Grommet theme={hpe} full>
      <AuthProvider>
        <ApiProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="audits" element={<AuditsList />} />
                <Route path="audits/:id" element={<AuditDetail />} />
                <Route path="audits/new" element={<NewAudit />} />
                <Route path="incidents" element={<IncidentsList />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ApiProvider>
      </AuthProvider>
    </Grommet>
  );
}

export default App;
