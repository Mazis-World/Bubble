/**
 * Browser Notification Service
 * Handles browser notifications for status updates and other events
 */

class NotificationService {
  constructor() {
    this.permission = null;
    this.preferences = this.loadPreferences();
    this.previousMemberStates = new Map(); // Track previous states to detect changes
    this.isInitialized = false;
  }

  /**
   * Initialize the notification service
   * Request permission if not already granted/denied
   */
  async initialize() {
    if (this.isInitialized) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    this.permission = Notification.permission;

    // Request permission if not already set
    if (this.permission === 'default') {
      // Don't auto-request - let user trigger it via UI
      console.log('Notification permission not yet requested');
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      throw new Error('Notification permission was denied. Please enable it in your browser settings.');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        // Show a welcome notification
        this.show('Notifications enabled!', {
          body: 'You\'ll now receive notifications for status updates and other important events.',
          icon: '/favicon.svg',
          tag: 'welcome',
          requireInteraction: false
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.permission === 'granted' && this.preferences.enabled;
  }

  /**
   * Show a notification
   */
  show(title, options = {}) {
    if (!this.isEnabled()) {
      return null;
    }

    const defaultOptions = {
      icon: '/favicon.svg',
      badge: '/favicon-32x32.png',
      tag: 'default',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();

        // Handle custom click action
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto-close after 5 seconds if not requireInteraction
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show notification for status update
   */
  notifyStatusUpdate(member, previousStatus = null) {
    if (!this.isEnabled() || !this.preferences.statusUpdates) {
      return null;
    }

    const memberName = member.name || 'A family member';
    const status = member.status || '😊';
    const statusText = member.statusText || '';
    
    let title = `${memberName} updated their status`;
    let body = statusText || `New status: ${status}`;

    // Special handling for important statuses
    if (status === '🆘' || status === '🚨' || statusText?.toLowerCase().includes('help')) {
      title = `🆘 ${memberName} needs help!`;
      body = statusText || 'Check their status update';
      return this.show(title, {
        body,
        icon: member.photoURL || '/favicon.svg',
        tag: `status-${member.id}`,
        requireInteraction: true,
        badge: '/favicon-32x32.png',
        onClick: () => {
          // Focus the app window
          window.focus();
        }
      });
    }

    // Only notify if status actually changed
    if (previousStatus && previousStatus === status && !statusText) {
      return null; // No change, don't notify
    }

    return this.show(title, {
      body,
      icon: member.photoURL || '/favicon.svg',
      tag: `status-${member.id}`,
      requireInteraction: false,
      badge: '/favicon-32x32.png'
    });
  }

  /**
   * Show notification for new member joining
   */
  notifyNewMember(member) {
    if (!this.isEnabled() || !this.preferences.newMembers) {
      return null;
    }

    const memberName = member.name || 'Someone';
    return this.show('New family member!', {
      body: `${memberName} joined your bubble`,
      icon: member.photoURL || '/favicon.svg',
      tag: `member-${member.id}`,
      requireInteraction: false,
      badge: '/favicon-32x32.png'
    });
  }

  /**
   * Show notification for location update
   */
  notifyLocationUpdate(member) {
    if (!this.isEnabled() || !this.preferences.locationUpdates) {
      return null;
    }

    const memberName = member.name || 'A family member';
    return this.show('Location updated', {
      body: `${memberName} updated their location`,
      icon: member.photoURL || '/favicon.svg',
      tag: `location-${member.id}`,
      requireInteraction: false,
      badge: '/favicon-32x32.png'
    });
  }

  /**
   * Track member states and detect changes
   */
  trackMemberState(memberId, currentState) {
    const previousState = this.previousMemberStates.get(memberId);
    this.previousMemberStates.set(memberId, {
      status: currentState.status,
      statusText: currentState.statusText,
      timestamp: Date.now()
    });
    return previousState;
  }

  /**
   * Clear tracked states
   */
  clearTrackedStates() {
    this.previousMemberStates.clear();
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const stored = localStorage.getItem('familyBubble_notificationPreferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }

    // Default preferences
    return {
      enabled: true,
      statusUpdates: true,
      newMembers: true,
      locationUpdates: false, // Off by default to avoid spam
    };
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences(preferences) {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      localStorage.setItem('familyBubble_notificationPreferences', JSON.stringify(this.preferences));
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Get permission status
   */
  getPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Initialize on module load
notificationService.initialize();
