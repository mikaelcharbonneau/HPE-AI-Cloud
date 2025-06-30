import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Nav, 
  Button,
  Text
} from 'grommet';
import { 
  Dashboard,
  DocumentText,
  Alert,
  BarChart,
  Home
} from 'grommet-icons';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Dashboard size="small" />
  },
  {
    label: 'Audits',
    path: '/audits',
    icon: <DocumentText size="small" />
  },
  {
    label: 'Incidents',
    path: '/incidents',
    icon: <Alert size="small" />
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart size="small" />
  }
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string): boolean => {
    return location.pathname === path || 
           (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <Box 
      width="240px" 
      background="white" 
      border={{ side: 'right', color: 'border' }}
      pad={{ vertical: 'medium' }}
    >
      <Nav gap="xsmall">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            icon={item.icon}
            label={
              <Text 
                size="small" 
                weight={isActive(item.path) ? 'bold' : 'normal'}
              >
                {item.label}
              </Text>
            }
            onClick={() => navigate(item.path)}
            plain
            hoverIndicator
            active={isActive(item.path)}
            justify="start"
            pad={{ horizontal: 'medium', vertical: 'small' }}
          />
        ))}
      </Nav>
    </Box>
  );
}

export default Sidebar; 