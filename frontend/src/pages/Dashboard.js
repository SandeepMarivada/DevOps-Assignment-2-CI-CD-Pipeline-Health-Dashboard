import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchDashboardMetrics } from '../store/slices/metricsSlice';
import { fetchPipelines } from '../store/slices/pipelinesSlice';
import { fetchBuilds } from '../store/slices/buildsSlice';
import { useSnackbar } from 'notistack';

const Dashboard = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  
  const { dashboard: metrics, loading: metricsLoading } = useSelector(state => state.metrics);
  const { items: pipelines, loading: pipelinesLoading } = useSelector(state => state.pipelines);
  const { items: builds, loading: buildsLoading } = useSelector(state => state.builds);
  
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchDashboardMetrics({ days: 30 })),
        dispatch(fetchPipelines()),
        dispatch(fetchBuilds({ days: 7 }))
      ]);
    } catch (error) {
      enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    enqueueSnackbar('Refreshing dashboard data...', { variant: 'info' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failure': return 'error';
      case 'running': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon />;
      case 'failure': return <ErrorIcon />;
      case 'running': return <ScheduleIcon />;
      case 'pending': return <ScheduleIcon />;
      default: return <BuildIcon />;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  // Use real data from metrics API instead of mock data
  const getStatusDistributionData = () => {
    if (!metrics?.overview?.status_distribution) return [];
    
    const { status_distribution } = metrics.overview;
    return [
      { name: 'Success', value: status_distribution.success || 0, color: theme.palette.success.main },
      { name: 'Failed', value: status_distribution.failed || 0, color: theme.palette.error.main },
      { name: 'Running', value: status_distribution.running || 0, color: theme.palette.warning.main },
      { name: 'Pending', value: status_distribution.pending || 0, color: theme.palette.info.main },
    ].filter(item => item.value > 0); // Only show statuses with values > 0
  };

  const getSuccessRateData = () => {
    if (!metrics?.trends?.daily) return [];
    
    return Object.entries(metrics.trends.daily).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0
    })).slice(-7); // Last 7 days
  };

  const getBuildTimeData = () => {
    if (!metrics?.trends?.daily) return [];
    
    return Object.entries(metrics.trends.daily).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: data.total > 0 ? Math.round(data.average_duration || 0) : 0
    })).slice(-7); // Last 7 days
  };

  const isLoading = metricsLoading || pipelinesLoading || buildsLoading;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Overall Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Success Rate
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {metrics?.overview?.success_rate ? formatPercentage(metrics.overview.success_rate) : '0%'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="success" sx={{ mr: 0.5, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  {metrics?.overview?.success_rate ? 'Based on real data' : 'No data available'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Build Time */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Avg Build Time
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {metrics?.overview?.average_duration ? formatDuration(metrics.overview.average_duration) : '0s'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingDownIcon color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  {metrics?.overview?.average_duration ? 'Based on real data' : 'No data available'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Pipelines */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Active Pipelines
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {pipelines?.length || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BuildIcon color="primary" sx={{ mr: 0.5, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  {pipelines?.length ? 'Active pipelines' : 'No pipelines'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Builds Today */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Builds Today
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {builds?.length || 0}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BuildIcon color="primary" sx={{ mr: 0.5, fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  {builds?.filter(b => b.status === 'success').length || 0} successful
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Success Rate Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Success Rate Trend (7 days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSuccessRateData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[90, 100]} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="rate" stroke={theme.palette.success.main} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Build Time Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Build Time Trend (7 days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getBuildTimeData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="time" stroke={theme.palette.primary.main} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pipeline Status Overview */}
      <Grid container spacing={3}>
        {/* Pipeline Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Pipeline Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={getStatusDistributionData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getStatusDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {getStatusDistributionData().map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {item.name}: {item.value}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Pipeline Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                Recent Pipeline Activity
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {pipelines?.slice(0, 8).map((pipeline) => (
                  <Box
                    key={pipeline.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(pipeline.status)}
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {pipeline.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pipeline.team} • {pipeline.type}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={pipeline.status}
                      color={getStatusColor(pipeline.status)}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
