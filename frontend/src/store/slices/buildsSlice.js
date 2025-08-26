import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchBuilds = createAsyncThunk(
  'builds/fetchBuilds',
  async ({ page = 1, limit = 20, pipeline_id, status, days } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (pipeline_id) params.append('pipeline_id', pipeline_id);
      if (status) params.append('status', status);
      if (days) params.append('days', days);

      const response = await axios.get(`/api/builds?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch builds');
    }
  }
);

export const fetchBuildById = createAsyncThunk(
  'builds/fetchBuildById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/builds/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch build');
    }
  }
);

export const fetchBuildLogs = createAsyncThunk(
  'builds/fetchBuildLogs',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/builds/${id}/logs`);
      return { id, logs: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch build logs');
    }
  }
);

export const fetchBuildMetrics = createAsyncThunk(
  'builds/fetchBuildMetrics',
  async ({ pipeline_id, days = 30 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (pipeline_id) params.append('pipeline_id', pipeline_id);
      params.append('days', days);

      const response = await axios.get(`/api/builds/metrics/summary?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch build metrics');
    }
  }
);

export const updateBuildStatus = createAsyncThunk(
  'builds/updateBuildStatus',
  async ({ id, status, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/builds/${id}`, { status, ...data });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update build status');
    }
  }
);

const initialState = {
  items: [],
  currentBuild: null,
  buildLogs: {},
  metrics: null,
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
    status: '',
    days: 30,
  },
};

const buildsSlice = createSlice({
  name: 'builds',
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
        status: '',
        days: 30,
      };
    },
    addBuild: (state, action) => {
      state.items.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateBuildInList: (state, action) => {
      const { id, ...updates } = action.payload;
      const index = state.items.findIndex(b => b.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updates };
      }
      if (state.currentBuild?.id === id) {
        state.currentBuild = { ...state.currentBuild, ...updates };
      }
    },
    clearBuildLogs: (state, action) => {
      if (action.payload) {
        delete state.buildLogs[action.payload];
      } else {
        state.buildLogs = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch builds
      .addCase(fetchBuilds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuilds.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.builds;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBuilds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch build by ID
      .addCase(fetchBuildById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuildById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBuild = action.payload;
      })
      .addCase(fetchBuildById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch build logs
      .addCase(fetchBuildLogs.fulfilled, (state, action) => {
        state.buildLogs[action.payload.id] = action.payload.logs;
      })
      
      // Fetch build metrics
      .addCase(fetchBuildMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      })
      
      // Update build status
      .addCase(updateBuildStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentBuild?.id === action.payload.id) {
          state.currentBuild = action.payload;
        }
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  clearFilters, 
  addBuild, 
  updateBuildInList, 
  clearBuildLogs 
} = buildsSlice.actions;

export default buildsSlice.reducer;
