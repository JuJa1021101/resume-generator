import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { NotificationManager } from './NotificationManager';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CpuChipIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../stores/ui-store';
import { useAppStore } from '../stores/app-store';
import { useNavigation } from '../hooks/useNavigation';

export const Layout: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, notifications } = useUIStore();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { isCurrentPath } = useNavigation();

  const navigation = [
    { name: language === 'zh-CN' ? '首页' : 'Home', href: '/', icon: HomeIcon },
    { name: language === 'zh-CN' ? '分析' : 'Analysis', href: '/analysis', icon: ChartBarIcon },
    { name: language === 'zh-CN' ? '结果' : 'Results', href: '/results', icon: DocumentTextIcon },
    { name: language === 'zh-CN' ? '历史' : 'History', href: '/history', icon: ClockIcon },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <NotificationManager />
      {/* Header */}
      <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
              <CpuChipIcon className="h-8 w-8 text-primary-600" />
              <h1 className={`ml-2 text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                AI Resume Generator
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="relative">
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
                  <button className={`p-2 rounded-md ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    <span className="sr-only">Notifications</span>
                    <div className="h-5 w-5 rounded-full bg-yellow-400"></div>
                  </button>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {theme === 'dark' ? '🌞' : '🌙'}
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className={`px-3 py-1 text-sm rounded-md ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {language === 'zh-CN' ? 'EN' : '中文'}
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-8">
                {navigation.map(item => {
                  const isActive = isCurrentPath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}>
          <div className={`fixed left-0 top-0 h-full w-64 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`} onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'zh-CN' ? '导航' : 'Navigation'}
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-2 rounded-md ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-2">
                {navigation.map(item => {
                  const isActive = isCurrentPath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="grid grid-cols-4 py-2">
          {navigation.map(item => {
            const isActive = isCurrentPath(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center py-2 px-1 ${isActive
                  ? 'text-primary-600'
                  : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-gray-600'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};