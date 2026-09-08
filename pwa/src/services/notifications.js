/**
 * Notification service: system-tray push via the service worker when possible,
 * with a page Notification fallback. FCM delivers alerts when the app is closed.
 */

import { mergeFcmTokens } from './pushPayload';

const PUSH_SW_URL = '/firebase-messaging-sw.js';

class NotificationService {
  constructor() {
    this.permission = null;
    this.preferences = this.loadPreferences();
    this.previousMemberStates = new Map();
    this.isInitialized = false;
    this.pushRegistration = null;
    this.fcmToken = null;
    this.foregroundUnsub = null;
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

  canUseServiceWorkerNotifications() {
    return typeof navigator !== 'undefined'
      && !!navigator.serviceWorker
      && typeof navigator.serviceWorker.register === 'function';
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      await this.enablePush();
      return true;
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied';
      throw new Error('Notification permission was denied. Please enable it in your browser settings.');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        await this.enablePush();
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
    return this.getPermission() === 'granted' && this.preferences.enabled;
  }

  async getPushRegistration() {
    if (!this.canUseServiceWorkerNotifications()) return null;
    if (this.pushRegistration) return this.pushRegistration;
    try {
      const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
      if (existing) {
        this.pushRegistration = existing;
        return existing;
      }
      this.pushRegistration = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: '/' });
      return this.pushRegistration;
    } catch (error) {
      console.warn('Push service worker registration failed:', error);
      return null;
    }
  }

  async showViaPush(title, options) {
    const registration = await this.getPushRegistration();
    if (!registration || typeof registration.showNotification !== 'function') {
      return null;
    }
    await registration.showNotification(title, options);
    return { via: 'push', title, options };
  }

  showViaPage(title, options, onClick) {
    const notification = new Notification(title, options);

    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch (error) {
        // Some environments (tests / embedded webviews) do not implement focus.
      }
      notification.close();
      onClick?.();
    };

    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  }

  /**
   * Show a notification. Prefers the Push API (service worker) so Android/iOS
   * treat it as a system notification instead of an in-page toast.
   */
  show(title, options = {}) {
    if (!options.force && !this.isEnabled()) {
      return null;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    const { onClick, force, ...rest } = options;
    const defaultOptions = {
      icon: '/favicon.svg',
      badge: '/favicon-32x32.png',
      tag: 'default',
      requireInteraction: false,
      silent: false,
      ...rest
    };

    try {
      if (this.canUseServiceWorkerNotifications()) {
        return this.showViaPush(title, defaultOptions).catch((error) => {
          console.error('Error showing push notification:', error);
          return this.showViaPage(title, defaultOptions, onClick);
        });
      }
      return this.showViaPage(title, defaultOptions, onClick);
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
        data: { type: 'status', url: '/', tag: `status-${member.id}` },
        onClick: () => {
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
      badge: '/favicon-32x32.png',
      data: { type: 'status', url: '/', tag: `status-${member.id}` },
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
      badge: '/favicon-32x32.png',
      data: { type: 'member', url: '/', tag: `member-${member.id}` },
    });
  }

  /**
   * Show notification for an SOS from another bubble member.
   * SOS alerts are not gated behind status-update preferences.
   */
  notifySosAlert(member, sos, onOpen) {
    if (this.preferences.sosAlerts === false) {
      return null;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    const memberName = member?.name || 'A family member';
    const sosId = sos?.sosId;
    const bubbleId = sos?.bubbleId;
    const url = sosId && bubbleId
      ? `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`
      : '/';

    return this.show('🚨 SOS ALERT', {
      body: `${memberName} has activated an SOS alert.\n\nTap to view their location.`,
      icon: member?.photoUrl || member?.photoURL || '/favicon.svg',
      tag: `sos-${sosId || member?.id || 'alert'}`,
      requireInteraction: true,
      force: true,
      silent: false,
      vibrate: [400, 150, 400, 150, 400],
      badge: '/favicon-32x32.png',
      data: {
        type: 'sos',
        sosId,
        bubbleId,
        url,
        tag: `sos-${sosId || member?.id || 'alert'}`,
      },
      onClick: () => {
        try {
          window.focus();
        } catch (error) {
          // Some environments (tests / embedded webviews) do not implement focus.
        }
        if (sosId && bubbleId) {
          window.history.replaceState({}, document.title, url);
        }
        onOpen?.();
      },
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
      badge: '/favicon-32x32.png',
      data: { type: 'location', url: '/', tag: `location-${member.id}` },
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
   * Register the messaging SW, subscribe to FCM, and save the token.
   */
  async enablePush(userId) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }
    if (!this.canUseServiceWorkerNotifications()) return null;

    const registration = await this.getPushRegistration();
    if (!registration) return null;

    try {
      const { getMessaging, getToken, isSupported, onMessage } = await import('firebase/messaging');
      const { app } = await import('../firebase');
      const supported = await isSupported();
      if (!supported) return null;

      const messaging = getMessaging(app);
      const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        ...(vapidKey ? { vapidKey } : {}),
      });
      this.fcmToken = token || null;

      if (token) {
        await this.persistFcmToken(userId, token);
      }

      if (!this.foregroundUnsub) {
        this.foregroundUnsub = onMessage(messaging, (payload) => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            return;
          }
          const data = payload?.data || {};
          const title = data.title || payload?.notification?.title || 'FamilyBubble';
          this.show(title, {
            body: data.body || payload?.notification?.body || '',
            tag: data.tag || 'familybubble',
            requireInteraction: data.type === 'sos',
            force: data.type === 'sos',
            data,
          });
        });
      }

      return token;
    } catch (error) {
      console.warn('FCM token registration failed:', error);
      return null;
    }
  }

  async persistFcmToken(userId, token) {
    const uid = userId || (await this.currentUserId());
    if (!uid || !token) return;
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const next = mergeFcmTokens(snap.data()?.fcmTokens, token);
      await updateDoc(userRef, { fcmTokens: next });
    } catch (error) {
      console.warn('Could not save FCM token:', error);
    }
  }

  async currentUserId() {
    try {
      const { auth } = await import('../firebase');
      return auth.currentUser?.uid || null;
    } catch (error) {
      return null;
    }
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
      locationUpdates: false,
      sosAlerts: true,
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
    this.permission = Notification.permission;
    return this.permission;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Initialize on module load
notificationService.initialize();
