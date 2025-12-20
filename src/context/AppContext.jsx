/**
 * Nexus QA - App Context
 * Global state management
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { agentsAPI, dashboardAPI, logsAPI } from '../services/api';

// Initial State
const initialState = {
  // Agents
  agents: [],
  agentsLoading: false,
  agentsError: null,

  // Dashboard Stats
  stats: null,
  statsLoading: false,

  // Logs
  logs: [],
  logsLoading: false,

  // UI State
  activeProject: null,
  isTestRunning: false,

  // WebSocket
  wsConnected: false,
};

// Action Types
const ACTIONS = {
  SET_AGENTS: 'SET_AGENTS',
  UPDATE_AGENT: 'UPDATE_AGENT',
  SET_AGENTS_LOADING: 'SET_AGENTS_LOADING',
  SET_AGENTS_ERROR: 'SET_AGENTS_ERROR',

  SET_STATS: 'SET_STATS',
  SET_STATS_LOADING: 'SET_STATS_LOADING',

  SET_LOGS: 'SET_LOGS',
  ADD_LOG: 'ADD_LOG',
  CLEAR_LOGS: 'CLEAR_LOGS',

  SET_ACTIVE_PROJECT: 'SET_ACTIVE_PROJECT',
  SET_TEST_RUNNING: 'SET_TEST_RUNNING',
  SET_WS_CONNECTED: 'SET_WS_CONNECTED',
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_AGENTS:
      return { ...state, agents: action.payload, agentsLoading: false };

    case ACTIONS.UPDATE_AGENT:
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? { ...agent, ...action.payload } : agent
        ),
      };

    case ACTIONS.SET_AGENTS_LOADING:
      return { ...state, agentsLoading: action.payload };

    case ACTIONS.SET_AGENTS_ERROR:
      return { ...state, agentsError: action.payload, agentsLoading: false };

    case ACTIONS.SET_STATS:
      return { ...state, stats: action.payload, statsLoading: false };

    case ACTIONS.SET_STATS_LOADING:
      return { ...state, statsLoading: action.payload };

    case ACTIONS.SET_LOGS:
      return { ...state, logs: action.payload, logsLoading: false };

    case ACTIONS.ADD_LOG:
      return { ...state, logs: [...state.logs, action.payload].slice(-100) }; // Son 100 log

    case ACTIONS.CLEAR_LOGS:
      return { ...state, logs: [] };

    case ACTIONS.SET_ACTIVE_PROJECT:
      return { ...state, activeProject: action.payload };

    case ACTIONS.SET_TEST_RUNNING:
      return { ...state, isTestRunning: action.payload };

    case ACTIONS.SET_WS_CONNECTED:
      return { ...state, wsConnected: action.payload };

    default:
      return state;
  }
}

// Context
const AppContext = createContext(null);

// Provider
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Fetch Agents
  const fetchAgents = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_AGENTS_LOADING, payload: true });
    try {
      const response = await agentsAPI.getAll();
      dispatch({ type: ACTIONS.SET_AGENTS, payload: response.data || [] });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_AGENTS_ERROR, payload: error.message });
    }
  }, []);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_STATS_LOADING, payload: true });
    try {
      const response = await dashboardAPI.getStats();
      dispatch({ type: ACTIONS.SET_STATS, payload: response.data });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async (limit = 50) => {
    try {
      const response = await logsAPI.getAll({ limit });
      dispatch({ type: ACTIONS.SET_LOGS, payload: response.data || [] });
    } catch (error) {
      console.error('Logs fetch error:', error);
    }
  }, []);

  // Update Agent (from WebSocket)
  const updateAgent = useCallback((agent) => {
    dispatch({ type: ACTIONS.UPDATE_AGENT, payload: agent });
  }, []);

  // Add Log (from WebSocket)
  const addLog = useCallback((log) => {
    dispatch({ type: ACTIONS.ADD_LOG, payload: log });
  }, []);

  // Set Test Running
  const setTestRunning = useCallback((running) => {
    dispatch({ type: ACTIONS.SET_TEST_RUNNING, payload: running });
  }, []);

  // Set WebSocket Connected
  const setWsConnected = useCallback((connected) => {
    dispatch({ type: ACTIONS.SET_WS_CONNECTED, payload: connected });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
    fetchStats();
    fetchLogs();
  }, [fetchAgents, fetchStats, fetchLogs]);

  const value = {
    ...state,
    dispatch,
    fetchAgents,
    fetchStats,
    fetchLogs,
    updateAgent,
    addLog,
    setTestRunning,
    setWsConnected,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export default AppContext;
