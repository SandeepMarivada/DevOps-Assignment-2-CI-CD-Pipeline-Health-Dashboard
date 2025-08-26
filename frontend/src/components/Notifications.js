import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, IconButton,
  List, ListItem, ListItemText, ListItemIcon, Collapse,
  Button, Alert, LinearProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

const getStatusIcon = (status) => {
  switch (status) {
    case 'failed':
      return <ErrorIcon color="error" />;
    case 'success':
      return <SuccessIcon color="success" />;
    default:
      return <WarningIcon color="warning" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'failed':
      return 'error';
    case 'success':
      return 'success';
    default:
      return 'warning';
  }
};

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.notifications);
      } else {
        enqueueSnackbar('Failed to fetch notifications', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Error fetching notifications', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

    const sendTestAlert = async () => {
    try {
      const response = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        enqueueSnackbar('Test alert sent successfully', { variant: 'success' });
        fetchNotifications(); // Refresh the list
      } else {
        enqueueSnackbar('Failed to send test alert', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Error sending test alert', { variant: 'error' });
    }
  };

  const sendTestEmail = async () => {
    try {
      const response = await fetch('/api/notifications/test-email', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: ['sandeep.marivada@talentica.com']
        })
      });
      const data = await response.json();

      if (data.success) {
        enqueueSnackbar('Test email sent successfully!', { variant: 'success' });
        enqueueSnackbar(`Preview URL: ${data.data.previewURL}`, { variant: 'info' });
      } else {
        enqueueSnackbar(`Failed to send test email: ${data.error}`, { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Error sending test email', { variant: 'error' });
    }
  };

  const clearNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/clear', { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        enqueueSnackbar('Notifications cleared successfully', { variant: 'success' });
        setNotifications([]);
      } else {
        enqueueSnackbar('Failed to clear notifications', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Error clearing notifications', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const failedCount = notifications.filter(n => n.status === 'failed').length;
  const successCount = notifications.filter(n => n.status === 'success').length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Notifications & Alerts
        </Typography>
                       <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                 <Button
                   variant="outlined"
                   startIcon={<NotificationsIcon />}
                   onClick={sendTestAlert}
                 >
                   Send Test Alert
                 </Button>
                 <Button
                   variant="outlined"
                   color="primary"
                   startIcon={<NotificationsIcon />}
                   onClick={sendTestEmail}
                 >
                   Send Test Email
                 </Button>
                 <Button
                   variant="outlined"
                   color="secondary"
                   startIcon={<ClearIcon />}
                   onClick={clearNotifications}
                 >
                   Clear All
                 </Button>
                 <IconButton onClick={fetchNotifications} disabled={loading}>
                   <RefreshIcon />
                 </IconButton>
               </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Alerts
            </Typography>
            <Typography variant="h4" component="div">
              {notifications.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Failed Builds
            </Typography>
            <Typography variant="h4" component="div" color="error">
              {failedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Successful Builds
            </Typography>
            <Typography variant="h4" component="div" color="success">
              {successCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Notifications List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Recent Alerts ({notifications.length})
            </Typography>
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {notifications.length === 0 ? (
            <Alert severity="info">
              No notifications yet. Build alerts will appear here when pipelines run.
            </Alert>
          ) : (
            <Collapse in={expanded}>
              <List>
                {notifications.map((notification) => (
                  <ListItem key={notification.id} divider>
                    <ListItemIcon>
                      {getStatusIcon(notification.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={new Date(notification.timestamp).toLocaleString()}
                    />
                    <Chip
                      label={notification.status.toUpperCase()}
                      color={getStatusColor(notification.status)}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          )}

          {!expanded && notifications.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              Click expand to see all {notifications.length} notifications
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Notifications;
