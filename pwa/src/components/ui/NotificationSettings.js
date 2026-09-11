import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { notificationService } from '../../services/notifications';
import { analyticsService } from '../../services/analytics';

const NotificationSettings = () => {
  const [permission, setPermission] = useState('default');
  const [preferences, setPreferences] = useState(notificationService.getPreferences());
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check permission status
    const checkPermission = () => {
      const currentPermission = notificationService.getPermission();
      setPermission(currentPermission);
      
      // Update preferences from service
      setPreferences(notificationService.getPreferences());
    };

    checkPermission();
    
    // Check periodically in case user changes browser settings
    const interval = setInterval(checkPermission, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    setError(null);
    
    // Track permission request
    analyticsService.trackNotificationPermissionRequest();
    
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setPermission('granted');
        // Track permission granted
        analyticsService.trackNotificationPermissionGranted();
      } else {
        setPermission('denied');
        setError('Notification permission was denied. You can enable it in your browser settings.');
      }
    } catch (err) {
      setError(err.message);
      setPermission('denied');
    } finally {
      setRequesting(false);
    }
  };

  const handleTogglePreference = (key) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    notificationService.savePreferences(newPreferences);
    setPreferences(newPreferences);
    // Track settings change
    analyticsService.trackNotificationSettingsChange(newPreferences);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
        <Bell size={16} />
        Notifications
      </h4>

      {/* Permission Status */}
      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
        {permission === 'unsupported' && (
          <div className="flex items-center gap-3 text-gray-400">
            <BellOff size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium">Notifications not supported</p>
              <p className="text-xs text-gray-500">Your browser doesn't support notifications</p>
            </div>
          </div>
        )}

        {permission === 'default' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Enable notifications</p>
                <p className="text-xs text-gray-400">Get lock-screen alerts for status updates and SOS, even when the app is closed</p>
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              disabled={requesting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Requesting...</span>
                </>
              ) : (
                <>
                  <Bell size={18} />
                  <span>Enable Notifications</span>
                </>
              )}
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <div className="flex items-center gap-3 text-emerald-400">
            <Check size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium">Push notifications enabled</p>
              <p className="text-xs text-gray-400">You'll get system alerts even when FamilyBubble is closed</p>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-red-400">
              <X size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium">Notifications disabled</p>
                <p className="text-xs text-gray-400">
                  Enable notifications in your browser settings to receive updates
                </p>
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences - Only show if permission is granted */}
      {permission === 'granted' && (
        <div className="space-y-3">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Enable notifications</p>
              <p className="text-xs text-gray-400">Master switch for all notifications</p>
            </div>
            <button
              onClick={() => handleTogglePreference('enabled')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.enabled ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* SOS Alerts - on by default */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">SOS alerts</p>
              <p className="text-xs text-gray-400">When a family member activates SOS</p>
            </div>
            <button
              onClick={() => handleTogglePreference('sosAlerts')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.sosAlerts !== false ? 'bg-red-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.sosAlerts !== false ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status Updates */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Status updates</p>
              <p className="text-xs text-gray-400">When family members update their status</p>
            </div>
            <button
              onClick={() => handleTogglePreference('statusUpdates')}
              disabled={!preferences.enabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.statusUpdates && preferences.enabled ? 'bg-blue-600' : 'bg-gray-700'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.statusUpdates && preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* New Members */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">New members</p>
              <p className="text-xs text-gray-400">When someone joins your bubble</p>
            </div>
            <button
              onClick={() => handleTogglePreference('newMembers')}
              disabled={!preferences.enabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.newMembers && preferences.enabled ? 'bg-blue-600' : 'bg-gray-700'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.newMembers && preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Place Alerts */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Place arrivals and departures</p>
              <p className="text-xs text-gray-400">When family arrive at or leave Home, School, or Work</p>
            </div>
            <button
              onClick={() => handleTogglePreference('placeAlerts')}
              disabled={!preferences.enabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.placeAlerts !== false && preferences.enabled ? 'bg-blue-600' : 'bg-gray-700'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.placeAlerts !== false && preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Location Updates - Off by default */}
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Location updates</p>
              <p className="text-xs text-gray-400">When family members update their location</p>
            </div>
            <button
              onClick={() => handleTogglePreference('locationUpdates')}
              disabled={!preferences.enabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences.locationUpdates && preferences.enabled ? 'bg-blue-600' : 'bg-gray-700'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.locationUpdates && preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
