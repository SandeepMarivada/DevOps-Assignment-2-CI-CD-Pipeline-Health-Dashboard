import { configureStore } from '@reduxjs/toolkit';
import pipelinesReducer from './slices/pipelinesSlice';
import buildsReducer from './slices/buildsSlice';
import metricsReducer from './slices/metricsSlice';
import alertsReducer from './slices/alertsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    pipelines: pipelinesReducer,
    builds: buildsReducer,
    metrics: metricsReducer,
    alerts: alertsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});
