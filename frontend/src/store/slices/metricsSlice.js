import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchDashboardMetrics = createAsyncThunk(
  'metrics/fetchDashboardMetrics',
  async ({ days = 30 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/metrics/dashboard?days=${days}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard metrics');
    }
  }
);

export const fetchPipelineMetrics = createAsyncThunk(
  'metrics/fetchPipelineMetrics',
  async ({ id, days = 30 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/metrics/pipelines/${id}?days=${days}`);
      return { id, data: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch pipeline metrics');
    }
  }
);

export const fetchTrends = createAsyncThunk(
  'metrics/fetchTrends',
  async ({ days = 30, metric_type } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('days', days);
      if (metric_type) params.append('metric_type', metric_type);

      const response = await axios.get(`/api/metrics/trends?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch trends');
    }
  }
);

export const fetchPerformanceBenchmarks = createAsyncThunk(
  'metrics/fetchPerformanceBenchmarks',
  async ({ days = 30 } = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/metrics/performance?days=${days}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch performance benchmarks');
    }
  }
);

const initialState = {
  dashboard: null,
  pipelineMetrics: {},
  trends: null,
  performance: null,
  loading: false,
  error: null,
  filters: {
    days: 30,
    metric_type: '',
  },
};

const metricsSlice = createSlice({
  name: 'metrics',
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
        days: 30,
        metric_type: '',
      };
    },
    updatePipelineMetric: (state, action) => {
      const { pipeline_id, metric_type, value, timestamp } = action.payload;
      if (!state.pipelineMetrics[pipeline_id]) {
        state.pipelineMetrics[pipeline_id] = {};
      }
      if (!state.pipelineMetrics[pipeline_id][metric_type]) {
        state.pipelineMetrics[pipeline_id][metric_type] = [];
      }
      state.pipelineMetrics[pipeline_id][metric_type].push({ value, timestamp });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard metrics
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch pipeline metrics
      .addCase(fetchPipelineMetrics.fulfilled, (state, action) => {
        const { id, data } = action.payload;
        state.pipelineMetrics[id] = data;
      })
      
      // Fetch trends
      .addCase(fetchTrends.fulfilled, (state, action) => {
        state.trends = action.payload;
      })
      
      // Fetch performance benchmarks
      .addCase(fetchPerformanceBenchmarks.fulfilled, (state, action) => {
        state.performance = action.payload;
      });
  },
});

export const { 
  clearError, 
  setFilters, 
  clearFilters, 
  updatePipelineMetric 
} = metricsSlice.actions;

export default metricsSlice.reducer;
