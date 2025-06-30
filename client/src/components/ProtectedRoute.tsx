import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TEMPORARY BYPASS - Always allow access to see the app
  return <>{children}</>;
}

export default ProtectedRoute