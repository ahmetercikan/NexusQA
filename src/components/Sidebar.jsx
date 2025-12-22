/**
 * Sidebar Component
 * Ana navigasyon menüsü
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Settings,
  FlaskConical,
  Zap,
  FileText,
  CheckSquare,
  ChevronDown,
  Wand2,
} from 'lucide-react';
import NexusLogo from './NexusLogo';

// TestTube İkonu (Özel)
const TestTube = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01v0a2.83 2.83 0 0 1 0-4L17 3z" />
    <path d="m16 2 6 6" />
    <path d="M12 16H4" />
  </svg>
);

const menuItems = [
  { id: 'reports', path: '/reports', icon: Activity, label: 'Raporlar & Analiz' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'Sistem Ayarları' },
];

const agentManagementItems = [
  { id: 'dashboard', path: '/', label: 'Orkestrasyon Paneli', icon: LayoutDashboard },
  { id: 'agents', path: '/agents', label: 'Agent Havuzu', icon: Cpu },
];

const testManagementItems = [
  { id: 'documents', path: '/documents', icon: FileText, label: 'Test Case Generator' },
  { id: 'test-scenarios', path: '/test-scenarios', icon: CheckSquare, label: 'Test Senaryoları' },
  { id: 'test-suites', path: '/test-suites', icon: TestTube, label: 'Test Suitleri' },
];

export default function Sidebar({ wsConnected }) {
  const { canAccessAgentManagement } = useAuth();
  const [agentMenuOpen, setAgentMenuOpen] = useState(true);
  const [testMenuOpen, setTestMenuOpen] = useState(true);
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800 flex flex-col justify-center items-center">
        <NexusLogo className="w-16 h-16" showText={false} />
        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-wider font-sans">
            NEXUS<span className="font-light text-white">QA</span>
          </h2>
          <p className="text-[0.65rem] text-slate-500 tracking-[0.15em] uppercase mt-1">AI Powered Automation</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Agent Management Dropdown - Sadece SUPER_ADMIN */}
        {canAccessAgentManagement() && (
          <div>
            <button
              onClick={() => setAgentMenuOpen(!agentMenuOpen)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white group"
            >
              <Zap size={20} />
              <span className="font-medium flex-1 text-left">Agent Management</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  agentMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Submenu */}
            {agentMenuOpen && (
              <div className="mt-2 ml-4 space-y-1 border-l border-slate-700 pl-0">
                {agentManagementItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-400 pl-3'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Management Dropdown */}
        <div>
          <button
            onClick={() => setTestMenuOpen(!testMenuOpen)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white group"
          >
            <TestTube size={20} />
            <span className="font-medium flex-1 text-left">Test Management</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                testMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Submenu */}
          {testMenuOpen && (
            <div className="mt-2 ml-4 space-y-1 border-l border-slate-700 pl-0">
              {testManagementItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-400 pl-3'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Automation Panel Button */}
        <div className="pt-2 border-t border-slate-700 mt-4">
          <NavLink
            to="/automation"
            className={({ isActive }) =>
              `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Wand2 size={20} />
            <span className="font-medium flex-1 text-left">Otomasyon Paneli</span>
          </NavLink>
        </div>

        {/* Diğer Menü Öğeleri */}
        <div className="pt-2 border-t border-slate-700 mt-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            ></div>
            <span
              className={`text-xs font-semibold ${
                wsConnected ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {wsConnected ? 'Sistem Online' : 'Bağlantı Yok'}
            </span>
          </div>
          <div className="text-xs text-slate-500">v1.0.0</div>
        </div>
      </div>
    </div>
  );
}
