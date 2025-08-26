import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Card, CardContent, Grid, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress, Tooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon, Visibility as ViewIcon, Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon, Build as BuildIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon, Schedule as PendingIcon, PlayArrow as RunningIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { fetchBuilds, fetchBuildLogs } from '../store/slices/buildsSlice';
import { fetchPipelines } from '../store/slices/pipelinesSlice';

const buildStatuses = [
  { value: 'pending', label: 'Pending', icon: <PendingIcon />, color: 'default' },
  { value: 'running', label: 'Running', icon: <RunningIcon />, color: 'info' },
  { value: 'success', label: 'Success', icon: <SuccessIcon />, color: 'success' },
  { value: 'failed', label: 'Failed', icon: <ErrorIcon />, color: 'error' },
  { value: 'cancelled', label: 'Cancelled', icon: <ErrorIcon />, color: 'warning' }
];

const getStatusColor = (status) => {
  const statusConfig = buildStatuses.find(s => s.value === status);
  return statusConfig?.color || 'default';
};

const getStatusIcon = (status) => {
  const statusConfig = buildStatuses.find(s => s.value === status);
  return statusConfig?.icon || <BuildIcon />;
};

const formatDuration = (seconds) => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

function Builds() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { items: builds, loading } = useSelector(state => state.builds);
  const { items: pipelines, loading: pipelinesLoading } = useSelector(state => state.pipelines);
  
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPipeline, setFilterPipeline] = useState('all');
  const [expandedBuild, setExpandedBuild] = useState(null);

  useEffect(() => {
    dispatch(fetchBuilds());
    dispatch(fetchPipelines());
  }, [dispatch]);

  const handleViewLogs = async (buildId) => {
    try {
      const logs = await dispatch(fetchBuildLogs(buildId)).unwrap();
      setSelectedBuild({ id: buildId, logs });
      setLogsDialogOpen(true);
    } catch (error) {
      enqueueSnackbar('Failed to fetch build logs', { variant: 'error' });
    }
  };

  const handleRefresh = () => {
    dispatch(fetchBuilds());
  };

  const filteredBuilds = builds.filter(build => {
    if (filterStatus !== 'all' && build.status !== filterStatus) return false;
    if (filterPipeline !== 'all' && build.pipeline_id !== filterPipeline) return false;
    return true;
  });

  const getPipelineName = (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline ? pipeline.name : `Pipeline ${pipelineId}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Builds
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {buildStatuses.map(status => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Pipeline</InputLabel>
            <Select
              value={filterPipeline}
              onChange={(e) => setFilterPipeline(e.target.value)}
              label="Pipeline"
            >
              <MenuItem value="all">All Pipelines</MenuItem>
              {pipelines.map(pipeline => (
                <MenuItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh Builds">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {filteredBuilds.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No builds found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filterStatus !== 'all' || filterPipeline !== 'all' 
                ? 'Try adjusting your filters'
                : 'Builds will appear here once pipelines are configured and run'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredBuilds.map((build) => (
            <Grid item xs={12} key={build.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getStatusIcon(build.status)}
                        <Typography variant="h6" sx={{ ml: 1, fontWeight: 500 }}>
                          Build #{build.buildNumber}
                        </Typography>
                        <Chip
                          label={build.status}
                          color={getStatusColor(build.status)}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Pipeline: {getPipelineName(build.pipeline_id)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Started:</strong> {formatDate(build.startedAt)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Duration:</strong> {formatDuration(build.duration)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Commit:</strong> {build.commitHash?.substring(0, 8) || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Logs">
                        <IconButton
                          size="small"
                          onClick={() => handleViewLogs(build.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Artifacts">
                        <IconButton
                          size="small"
                          disabled={build.status !== 'success'}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {build.message && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {build.message}
                    </Alert>
                  )}

                  <Accordion
                    expanded={expandedBuild === build.id}
                    onChange={() => setExpandedBuild(expandedBuild === build.id ? null : build.id)}
                    sx={{ mt: 2 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2">Build Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Branch:</strong> {build.branch || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Triggered by:</strong> {build.triggeredBy || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Environment:</strong> {build.environment || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Tests:</strong> {build.testResults ? `${build.testResults.passed}/${build.testResults.total}` : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Build Logs Dialog */}
      <Dialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Build Logs - Build #{selectedBuild?.id}
        </DialogTitle>
        <DialogContent>
          {selectedBuild?.logs ? (
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                maxHeight: '400px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {selectedBuild.logs}
            </Box>
          ) : (
            <Typography>Loading logs...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Builds;
