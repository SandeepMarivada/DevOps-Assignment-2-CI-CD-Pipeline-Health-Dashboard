import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchPipelines = createAsyncThunk(
  'pipelines/fetchPipelines',
  async ({ page = 1, limit = 20, status, type, team, search } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      if (team) params.append('team', team);
      if (search) params.append('search', search);

      const response = await axios.get(`/api/pipelines?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch pipelines');
    }
  }
);

export const fetchPipelineById = createAsyncThunk(
  'pipelines/fetchPipelineById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/pipelines/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch pipeline');
    }
  }
);

export const createPipeline = createAsyncThunk(
  'pipelines/createPipeline',
  async (pipelineData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/pipelines', pipelineData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create pipeline');
    }
  }
);

export const updatePipeline = createAsyncThunk(
  'pipelines/updatePipeline',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/pipelines/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update pipeline');
    }
  }
);

export const deletePipeline = createAsyncThunk(
  'pipelines/deletePipeline',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/pipelines/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete pipeline');
    }
  }
);

export const syncPipeline = createAsyncThunk(
  'pipelines/syncPipeline',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/pipelines/${id}/sync`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to sync pipeline');
    }
  }
);

const initialState = {
  items: [],
  currentPipeline: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {
    status: '',
    type: '',
    team: '',
    search: '',
  },
};

const pipelinesSlice = createSlice({
  name: 'pipelines',
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
        status: '',
        type: '',
        team: '',
        search: '',
      };
    },
    updatePipelineStatus: (state, action) => {
      const { id, status, lastBuild } = action.payload;
      const pipeline = state.items.find(p => p.id === id);
      if (pipeline) {
        pipeline.status = status;
        if (lastBuild) {
          pipeline.last_build = lastBuild;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pipelines
      .addCase(fetchPipelines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPipelines.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.pipelines;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPipelines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch pipeline by ID
      .addCase(fetchPipelineById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPipelineById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPipeline = action.payload;
      })
      .addCase(fetchPipelineById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create pipeline
      .addCase(createPipeline.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      
      // Update pipeline
      .addCase(updatePipeline.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentPipeline?.id === action.payload.id) {
          state.currentPipeline = action.payload;
        }
      })
      
      // Delete pipeline
      .addCase(deletePipeline.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (state.currentPipeline?.id === action.payload) {
          state.currentPipeline = null;
        }
      })
      
      // Sync pipeline
      .addCase(syncPipeline.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
        if (state.currentPipeline?.id === action.payload.id) {
          state.currentPipeline = { ...state.currentPipeline, ...action.payload };
        }
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  clearFilters, 
  updatePipelineStatus 
} = pipelinesSlice.actions;

export default pipelinesSlice.reducer;
