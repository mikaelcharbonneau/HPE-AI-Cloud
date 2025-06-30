import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from 'grommet';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <Box fill>
      <Header />
      <Box direction="row" flex>
        <Sidebar />
        <Box flex pad="medium" background="light-1">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default Layout; 