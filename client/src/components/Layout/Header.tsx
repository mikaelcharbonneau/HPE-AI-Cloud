import React from 'react';
import { 
  Header as GrommetHeader, 
  Box, 
  Text, 
  Button, 
  Avatar,
  DropButton,
  Nav,
  Anchor
} from 'grommet';
import { 
  User, 
  Logout,
  Hpe
} from 'grommet-icons';
import { useAuth } from '../../contexts/AuthContext';

function Header() {
  const { user, logout } = useAuth();

  const userMenuItems = [
    {
      label: 'Profile',
      icon: <User size="small" />,
      onClick: () => {
        // Handle profile navigation
        console.log('Navigate to profile');
      },
    },
    {
      label: 'Logout',
      icon: <Logout size="small" />,
      onClick: logout,
    },
  ];

  return (
    <GrommetHeader 
      background="brand" 
      pad={{ horizontal: 'medium', vertical: 'small' }}
      elevation="medium"
    >
      <Box direction="row" align="center" gap="medium">
        <Hpe color="white" size="large" />
        <Text size="large" weight="bold" color="white">
          Datacenter Audit Tool
        </Text>
      </Box>

      <Nav direction="row" align="center" gap="medium">
        <DropButton
          icon={
            <Box direction="row" align="center" gap="small">
              <Avatar size="small" background="accent-1">
                <Text size="small" weight="bold">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Text>
              </Avatar>
              <Text color="white" size="small">
                {user?.firstName} {user?.lastName}
              </Text>
            </Box>
          }
          dropContent={
            <Box pad="small" gap="small" background="white">
              {userMenuItems.map((item, index) => (
                <Button
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  onClick={item.onClick}
                  plain
                  hoverIndicator
                  justify="start"
                />
              ))}
            </Box>
          }
          dropAlign={{ top: 'bottom', right: 'right' }}
        />
      </Nav>
    </GrommetHeader>
  );
}

export default Header; 