import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert, LinearProgress, Tooltip, Fab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, PlayArrow as PlayIcon, Stop as StopIcon,
  GitHub as GitHubIcon, Build as BuildIcon, AccountTree as PipelineIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { fetchPipelines, createPipeline, updatePipeline, deletePipeline } from '../store/slices/pipelinesSlice';

function Pipelines() {
  const pipelineTypes = [
    { value: 'github-actions', label: 'GitHub Actions', icon: <GitHubIcon /> },
    { value: 'jenkins', label: 'Jenkins', icon: <BuildIcon /> },
    { value: 'gitlab-ci', label: 'GitLab CI', icon: <PipelineIcon /> },
    { value: 'azure-devops', label: 'Azure DevOps', icon: <PipelineIcon /> }
  ];

  const statusColors = {
    active: 'success',
    inactive: 'default',
    error: 'error',
    warning: 'warning'
  };
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { items: pipelines, loading } = useSelector(state => state.pipelines);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    url: '',
    token: '',
    branch: 'main',
    status: 'active'
  });

  useEffect(() => {
    dispatch(fetchPipelines());
  }, [dispatch]);

  const handleOpenDialog = (pipeline = null) => {
    if (pipeline) {
      setEditingPipeline(pipeline);
      setFormData({
        name: pipeline.name,
        type: pipeline.type,
        url: pipeline.url,
        token: pipeline.token || '',
        branch: pipeline.branch || 'main',
        status: pipeline.status
      });
    } else {
      setEditingPipeline(null);
      setFormData({
        name: '',
        type: '',
        url: '',
        token: '',
        branch: 'main',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPipeline(null);
    setFormData({
      name: '',
      type: '',
      url: '',
      token: '',
      branch: 'main',
      status: 'active'
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingPipeline) {
        await dispatch(updatePipeline({ id: editingPipeline.id, ...formData })).unwrap();
        enqueueSnackbar('Pipeline updated successfully!', { variant: 'success' });
      } else {
        await dispatch(createPipeline(formData)).unwrap();
        enqueueSnackbar('Pipeline created successfully!', { variant: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar(error.message || 'Operation failed', { variant: 'error' });
    }
  };

  const handleDelete = async (pipelineId) => {
    if (window.confirm('Are you sure you want to delete this pipeline?')) {
      try {
        await dispatch(deletePipeline(pipelineId)).unwrap();
        enqueueSnackbar('Pipeline deleted successfully!', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(error.message || 'Delete failed', { variant: 'error' });
      }
    }
  };

  const handleRefresh = () => {
    dispatch(fetchPipelines());
  };

  const getPipelineTypeIcon = (type) => {
    return pipelineTypes.find(t => t.value === type)?.icon || <PipelineIcon />;
  };

  const getPipelineTypeLabel = (type) => {
    return pipelineTypes.find(t => t.value === type)?.label || type;
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
          Pipelines
        </Typography>
        <Box>
          <Tooltip title="Refresh Pipelines">
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Pipeline
          </Button>
        </Box>
      </Box>

      {pipelines.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No pipelines configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Get started by adding your first CI/CD pipeline
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Your First Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Last Build</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pipelines.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getPipelineTypeIcon(pipeline.type)}
                      <Typography sx={{ ml: 1, fontWeight: 500 }}>
                        {pipeline.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPipelineTypeLabel(pipeline.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pipeline.status}
                      color={statusColors[pipeline.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{pipeline.branch}</TableCell>
                  <TableCell>
                    {pipeline.lastBuild ? (
                      <Chip
                        label={pipeline.lastBuild.status}
                        color={pipeline.lastBuild.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No builds
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit Pipeline">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(pipeline)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Pipeline">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(pipeline.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Pipeline Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPipeline ? 'Edit Pipeline' : 'Add New Pipeline'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pipeline Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Pipeline Type</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    label="Pipeline Type"
                  >
                    {pipelineTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {type.icon}
                          <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Repository URL"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  required
                  placeholder="https://github.com/username/repo"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Token"
                  name="token"
                  value={formData.token}
                  onChange={handleInputChange}
                  type="password"
                  required
                  helperText="Personal access token or API key for authentication"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  placeholder="main"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.type || !formData.url || !formData.token}
          >
            {editingPipeline ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pipelines;
