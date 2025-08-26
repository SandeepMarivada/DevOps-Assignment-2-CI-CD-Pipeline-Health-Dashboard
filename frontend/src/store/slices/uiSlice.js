import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Modal states
  modals: {
    createPipeline: false,
    editPipeline: false,
    createAlert: false,
    editAlert: false,
    buildDetails: false,
    pipelineDetails: false,
    confirmDelete: false,
  },
  
  // Notification states
  notifications: {
    show: false,
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
    duration: 6000,
  },
  
  // Sidebar state
  sidebar: {
    open: true,
    collapsed: false,
  },
  
  // Theme preferences
  theme: {
    mode: 'light', // 'light' or 'dark'
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
  },
  
  // Loading states
  loading: {
    global: false,
    pipelines: false,
    builds: false,
    metrics: false,
    alerts: false,
  },
  
  // Error states
  errors: {
    global: null,
    pipelines: null,
    builds: null,
    metrics: null,
    alerts: null,
  },
  
  // Pagination states
  pagination: {
    pipelines: { page: 1, limit: 20 },
    builds: { page: 1, limit: 20 },
    alerts: { page: 1, limit: 20 },
  },
  
  // Filter states
  filters: {
    pipelines: {},
    builds: {},
    alerts: {},
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modal actions
    openModal: (state, action) => {
      const { modalName } = action.payload;
      if (state.modals.hasOwnProperty(modalName)) {
        state.modals[modalName] = true;
      }
    },
    
    closeModal: (state, action) => {
      const { modalName } = action.payload;
      if (state.modals.hasOwnProperty(modalName)) {
        state.modals[modalName] = false;
      }
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = false;
      });
    },
    
    // Notification actions
    showNotification: (state, action) => {
      const { message, type = 'info', duration = 6000 } = action.payload;
      state.notifications = {
        show: true,
        message,
        type,
        duration,
      };
    },
    
    hideNotification: (state) => {
      state.notifications.show = false;
    },
    
    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebar.open = !state.sidebar.open;
    },
    
    setSidebarOpen: (state, action) => {
      state.sidebar.open = action.payload;
    },
    
    toggleSidebarCollapsed: (state) => {
      state.sidebar.collapsed = !state.sidebar.collapsed;
    },
    
    // Theme actions
    toggleTheme: (state) => {
      state.theme.mode = state.theme.mode === 'light' ? 'dark' : 'light';
    },
    
    setTheme: (state, action) => {
      const { mode, primaryColor, secondaryColor } = action.payload;
      if (mode) state.theme.mode = mode;
      if (primaryColor) state.theme.primaryColor = primaryColor;
      if (secondaryColor) state.theme.secondaryColor = secondaryColor;
    },
    
    // Loading actions
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      if (state.loading.hasOwnProperty(key)) {
        state.loading[key] = value;
      }
    },
    
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    
    // Error actions
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors.hasOwnProperty(key)) {
        state.errors[key] = error;
      }
    },
    
    clearError: (state, action) => {
      const { key } = action.payload;
      if (state.errors.hasOwnProperty(key)) {
        state.errors[key] = null;
      }
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
    },
    
    // Pagination actions
    setPagination: (state, action) => {
      const { key, page, limit } = action.payload;
      if (state.pagination.hasOwnProperty(key)) {
        if (page !== undefined) state.pagination[key].page = page;
        if (limit !== undefined) state.pagination[key].limit = limit;
      }
    },
    
    resetPagination: (state, action) => {
      const { key } = action.payload;
      if (state.pagination.hasOwnProperty(key)) {
        state.pagination[key] = { page: 1, limit: 20 };
      }
    },
    
    // Filter actions
    setFilter: (state, action) => {
      const { key, filters } = action.payload;
      if (state.filters.hasOwnProperty(key)) {
        state.filters[key] = { ...state.filters[key], ...filters };
      }
    },
    
    clearFilter: (state, action) => {
      const { key } = action.payload;
      if (state.filters.hasOwnProperty(key)) {
        state.filters[key] = {};
      }
    },
    
    clearAllFilters: (state) => {
      Object.keys(state.filters).forEach(key => {
        state.filters[key] = {};
      });
    },
    
    // Reset all UI state
    resetUI: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  openModal,
  closeModal,
  closeAllModals,
  showNotification,
  hideNotification,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  toggleTheme,
  setTheme,
  setLoading,
  setGlobalLoading,
  setError,
  clearError,
  clearAllErrors,
  setPagination,
  resetPagination,
  setFilter,
  clearFilter,
  clearAllFilters,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
