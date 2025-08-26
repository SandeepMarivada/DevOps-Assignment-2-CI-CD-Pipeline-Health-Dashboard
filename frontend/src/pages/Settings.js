import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Switch,
  FormControlLabel, Divider, Avatar, IconButton, LinearProgress, Alert,
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Chip, Tooltip
} from '@mui/material';
import {
  Save as SaveIcon, Refresh as RefreshIcon, Edit as EditIcon,
  Notifications as NotificationsIcon, Security as SecurityIcon,
  Person as PersonIcon, Settings as SettingsIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { user, updateUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
    role: user?.role || 'user'
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    slackNotifications: true,
    buildFailures: true,
    buildSuccess: false,
    pipelineChanges: true,
    systemAlerts: true
  });

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    autoRefresh: true,
    refreshInterval: '30',
    theme: 'light',
    language: 'en',
    timezone: 'UTC'
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '24',
    passwordExpiry: '90',
    loginNotifications: true
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        role: user.role || 'user'
      });
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProfileInputChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationChange = (setting) => (event) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: event.target.checked
    });
  };

  const handleSystemSettingChange = (setting) => (event) => {
    setSystemSettings({
      ...systemSettings,
      [setting]: event.target.value
    });
  };

  const handleSecuritySettingChange = (setting) => (event) => {
    setSystemSettings({
      ...securitySettings,
      [setting]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user context
      updateUser({
        ...user,
        ...profileData
      });
      
      setEditingProfile(false);
      enqueueSnackbar('Profile updated successfully!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (settingsType) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      enqueueSnackbar(`${settingsType} settings saved successfully!`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Failed to save ${settingsType} settings`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Refresh settings from server
    enqueueSnackbar('Settings refreshed', { variant: 'info' });
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
          Settings
        </Typography>
        <Box>
          <Tooltip title="Refresh Settings">
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<SettingsIcon />} label="System" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>
      </Box>

      {/* Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Profile Information</Typography>
                  <Button
                    startIcon={editingProfile ? <SaveIcon /> : <EditIcon />}
                    variant={editingProfile ? 'contained' : 'outlined'}
                    onClick={editingProfile ? handleSaveProfile : () => setEditingProfile(true)}
                  >
                    {editingProfile ? 'Save' : 'Edit'}
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileInputChange}
                      disabled={!editingProfile}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileInputChange}
                      disabled={!editingProfile}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company"
                      name="company"
                      value={profileData.company}
                      onChange={handleProfileInputChange}
                      disabled={!editingProfile}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editingProfile}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        name="role"
                        value={profileData.role}
                        onChange={handleProfileInputChange}
                        label="Role"
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="super_admin">Super Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {editingProfile && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Make your changes and click Save to update your profile.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
                >
                  {profileData.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {profileData.name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {profileData.role?.replace('_', ' ').toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profileData.company || 'No company specified'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Notifications Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Notification Preferences</Typography>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={() => handleSaveSettings('Notification')}
              >
                Save Settings
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Notification Channels
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={handleNotificationChange('emailNotifications')}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.slackNotifications}
                      onChange={handleNotificationChange('slackNotifications')}
                    />
                  }
                  label="Slack Notifications"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Event Types
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.buildFailures}
                      onChange={handleNotificationChange('buildFailures')}
                    />
                  }
                  label="Build Failures"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.buildSuccess}
                      onChange={handleNotificationChange('buildSuccess')}
                    />
                  }
                  label="Build Success"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.pipelineChanges}
                      onChange={handleNotificationChange('pipelineChanges')}
                    />
                  }
                  label="Pipeline Changes"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.systemAlerts}
                      onChange={handleNotificationChange('systemAlerts')}
                    />
                  }
                  label="System Alerts"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* System Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">System Preferences</Typography>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={() => handleSaveSettings('System')}
              >
                Save Settings
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.autoRefresh}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings,
                        autoRefresh: e.target.checked
                      })}
                    />
                  }
                  label="Auto-refresh Dashboard"
                />

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Refresh Interval</InputLabel>
                  <Select
                    value={systemSettings.refreshInterval}
                    onChange={handleSystemSettingChange('refreshInterval')}
                    label="Refresh Interval"
                    disabled={!systemSettings.autoRefresh}
                  >
                    <MenuItem value="15">15 seconds</MenuItem>
                    <MenuItem value="30">30 seconds</MenuItem>
                    <MenuItem value="60">1 minute</MenuItem>
                    <MenuItem value="300">5 minutes</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={systemSettings.theme}
                    onChange={handleSystemSettingChange('theme')}
                    label="Theme"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={systemSettings.language}
                    onChange={handleSystemSettingChange('language')}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={systemSettings.timezone}
                    onChange={handleSystemSettingChange('timezone')}
                    label="Timezone"
                  >
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="EST">Eastern Time</MenuItem>
                    <MenuItem value="PST">Pacific Time</MenuItem>
                    <MenuItem value="GMT">GMT</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Security Settings</Typography>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={() => handleSaveSettings('Security')}
              >
                Save Settings
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={handleSecuritySettingChange('twoFactorAuth')}
                    />
                  }
                  label="Two-Factor Authentication"
                />

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Session Timeout</InputLabel>
                  <Select
                    value={securitySettings.sessionTimeout}
                    onChange={handleSecuritySettingChange('sessionTimeout')}
                    label="Session Timeout"
                  >
                    <MenuItem value="1">1 hour</MenuItem>
                    <MenuItem value="8">8 hours</MenuItem>
                    <MenuItem value="24">24 hours</MenuItem>
                    <MenuItem value="168">1 week</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Password Expiry</InputLabel>
                  <Select
                    value={securitySettings.passwordExpiry}
                    onChange={handleSecuritySettingChange('passwordExpiry')}
                    label="Password Expiry"
                  >
                    <MenuItem value="30">30 days</MenuItem>
                    <MenuItem value="60">60 days</MenuItem>
                    <MenuItem value="90">90 days</MenuItem>
                    <MenuItem value="365">1 year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.loginNotifications}
                      onChange={handleSecuritySettingChange('loginNotifications')}
                    />
                  }
                  label="Login Notifications"
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Security Tips:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    • Use strong, unique passwords
                  </Typography>
                  <Typography variant="body2">
                    • Enable two-factor authentication
                  </Typography>
                  <Typography variant="body2">
                    • Regularly review your login sessions
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}

export default Settings;
