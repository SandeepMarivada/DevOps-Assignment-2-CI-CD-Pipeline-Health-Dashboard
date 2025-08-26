import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async ({ page = 1, limit = 20, pipeline_id, severity, enabled } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (pipeline_id) params.append('pipeline_id', pipeline_id);
      if (severity) params.append('severity', severity);
      if (enabled !== undefined) params.append('enabled', enabled);

      const response = await axios.get(`/api/alerts?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch alerts');
    }
  }
);

export const fetchAlertById = createAsyncThunk(
  'alerts/fetchAlertById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/alerts/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch alert');
    }
  }
);

export const createAlert = createAsyncThunk(
  'alerts/createAlert',
  async (alertData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/alerts', alertData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create alert');
    }
  }
);

export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/alerts/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update alert');
    }
  }
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/alerts/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete alert');
    }
  }
);

export const testAlert = createAsyncThunk(
  'alerts/testAlert',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/alerts/${id}/test`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to test alert');
    }
  }
);

export const fetchAlertHistory = createAsyncThunk(
  'alerts/fetchAlertHistory',
  async ({ alert_id, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (alert_id) params.append('alert_id', alert_id);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axios.get(`/api/alerts/history?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch alert history');
    }
  }
);

export const acknowledgeAlert = createAsyncThunk(
  'alerts/acknowledgeAlert',
  async ({ alert_id, notes }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/alerts/history/acknowledge`, { alert_id, notes });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to acknowledge alert');
    }
  }
);

const initialState = {
  items: [],
  currentAlert: null,
  history: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {
    pipeline_id: '',
    severity: '',
    enabled: '',
  },
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        pipeline_id: '',
        severity: '',
        enabled: '',
      };
    },
    addAlert: (state, action) => {
      state.items.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateAlertInList: (state, action) => {
      const { id, ...updates } = action.payload;
      const index = state.items.findIndex(a => a.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updates };
      }
      if (state.currentAlert?.id === id) {
        state.currentAlert = { ...state.currentAlert, ...updates };
      }
    },
    addAlertHistory: (state, action) => {
      state.history.unshift(action.payload);
    },
    clearHistory: (state) => {
      state.history = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.alerts;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch alert by ID
      .addCase(fetchAlertById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAlert = action.payload;
      })
      .addCase(fetchAlertById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create alert
      .addCase(createAlert.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      
      // Update alert
      .addCase(updateAlert.fulfilled, (state, action) => {
        const index = state.items.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentAlert?.id === action.payload.id) {
          state.currentAlert = action.payload;
        }
      })
      
      // Delete alert
      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.items = state.items.filter(a => a.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (state.currentAlert?.id === action.payload) {
          state.currentAlert = null;
        }
      })
      
      // Test alert
      .addCase(testAlert.fulfilled, (state, action) => {
        // Handle test result if needed
      })
      
      // Fetch alert history
      .addCase(fetchAlertHistory.fulfilled, (state, action) => {
        state.history = action.payload.history;
      })
      
      // Acknowledge alert
      .addCase(acknowledgeAlert.fulfilled, (state, action) => {
        // Update alert status in list
        const index = state.items.findIndex(a => a.id === action.payload.alert_id);
        if (index !== -1) {
          state.items[index].status = 'acknowledged';
          state.items[index].acknowledged_at = action.payload.acknowledged_at;
        }
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  clearFilters, 
  addAlert, 
  updateAlertInList, 
  addAlertHistory, 
  clearHistory 
} = alertsSlice.actions;

export default alertsSlice.reducer;
