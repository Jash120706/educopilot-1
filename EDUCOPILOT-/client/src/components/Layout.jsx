import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  // Default to open on desktop screens
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 relative min-h-[calc(100vh-4rem)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div
          className={`flex-1 flex flex-col items-center min-w-0 transition-all duration-300 ${
            sidebarOpen ? 'md:pl-64' : 'md:pl-0'
          }`}
        >
          <main className="w-full max-w-7xl px-4 sm:px-6 md:px-8 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
