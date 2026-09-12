/**
 * Analytics Service
 * Comprehensive tracking of user behavior and events
 */

import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from '../firebase';

class AnalyticsService {
  constructor() {
    this.isEnabled = false;
    this.currentUserId = null;
    this.init();
  }

  /**
   * Initialize analytics
   */
  async init() {
    if (typeof window === 'undefined') return;
    
    try {
      if (analytics) {
        this.isEnabled = true;
        console.log('Analytics initialized');
      }
    } catch (error) {
      console.warn('Analytics initialization error:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if analytics is available
   */
  isAvailable() {
    return this.isEnabled && analytics !== null;
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId) {
    if (!this.isAvailable()) return;
    
    try {
      this.currentUserId = userId;
      setUserId(analytics, userId);
    } catch (error) {
      console.warn('Error setting user ID:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties) {
    if (!this.isAvailable()) return;
    
    try {
      setUserProperties(analytics, properties);
    } catch (error) {
      console.warn('Error setting user properties:', error);
    }
  }

  /**
   * Log a custom event
   */
  logEvent(eventName, eventParams = {}) {
    if (!this.isAvailable()) {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', eventName, eventParams);
      }
      return;
    }

    try {
      logEvent(analytics, eventName, eventParams);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', eventName, eventParams);
      }
    } catch (error) {
      console.warn('Error logging event:', error);
    }
  }

  // ============================================================================
  // AUTHENTICATION EVENTS
  // ============================================================================

  /**
   * Track user sign up
   */
  trackSignUp(method = 'email') {
    this.logEvent('sign_up', {
      method: method
    });
  }

  /**
   * Track user login
   */
  trackLogin(method = 'email') {
    this.logEvent('login', {
      method: method
    });
  }

  /**
   * Track user logout
   */
  trackLogout() {
    this.logEvent('logout');
  }

  // ============================================================================
  // BUBBLE EVENTS
  // ============================================================================

  /**
   * Track bubble creation
   */
  trackBubbleCreate(bubbleId, memberCount = 1) {
    this.logEvent('bubble_create', {
      bubble_id: bubbleId,
      member_count: memberCount
    });
  }

  /**
   * Track bubble join
   */
  trackBubbleJoin(bubbleId, method = 'invite') {
    this.logEvent('bubble_join', {
      bubble_id: bubbleId,
      method: method // 'invite', 'link', etc.
    });
  }

  /**
   * Track invite generation
   */
  trackInviteGenerate(bubbleId) {
    this.logEvent('invite_generate', {
      bubble_id: bubbleId
    });
  }

  /**
   * Track invite share
   */
  trackInviteShare(bubbleId, method = 'link') {
    this.logEvent('invite_share', {
      bubble_id: bubbleId,
      method: method // 'link', 'copy', etc.
    });
  }

  // ============================================================================
  // USER ENGAGEMENT EVENTS
  // ============================================================================

  /**
   * Track status update
   */
  trackStatusUpdate(bubbleId, status, hasLocation = false, hasText = false) {
    this.logEvent('status_update', {
      bubble_id: bubbleId,
      status: status,
      has_location: hasLocation,
      has_text: hasText
    });
  }

  /**
   * Track location update
   */
  trackLocationUpdate(bubbleId) {
    this.logEvent('location_update', {
      bubble_id: bubbleId
    });
  }

  trackCheckIn(bubbleId, hasLocation = true) {
    this.logEvent('check_in', {
      bubble_id: bubbleId,
      has_location: hasLocation,
    });
  }

  /**
   * Track profile update
   */
  trackProfileUpdate(bubbleId, fields = []) {
    this.logEvent('profile_update', {
      bubble_id: bubbleId,
      fields_updated: fields.join(',')
    });
  }

  /**
   * Track photo update
   */
  trackPhotoUpdate(bubbleId) {
    this.logEvent('photo_update', {
      bubble_id: bubbleId
    });
  }

  // ============================================================================
  // SUBSCRIPTION EVENTS
  // ============================================================================

  /**
   * Track subscription view (paywall shown)
   */
  trackSubscriptionView(source = 'default') {
    this.logEvent('view_paywall', {
      source: source // 'upgrade', 'trial_end', 'default', etc.
    });
  }

  /**
   * Track subscription purchase attempt
   */
  trackPurchaseAttempt(packageType, price) {
    this.logEvent('purchase_attempt', {
      package_type: packageType, // 'monthly', 'annual', 'lifetime'
      price: price
    });
  }

  /**
   * Track subscription purchase success
   */
  trackPurchaseSuccess(packageType, price, trialDays = 0) {
    this.logEvent('purchase', {
      package_type: packageType,
      price: price,
      trial_days: trialDays,
      currency: 'USD' // Adjust based on your pricing
    });
  }

  /**
   * Track subscription purchase failure
   */
  trackPurchaseFailure(packageType, error) {
    this.logEvent('purchase_failure', {
      package_type: packageType,
      error: error
    });
  }

  /**
   * Track trial start
   */
  trackTrialStart(packageType, trialDays) {
    this.logEvent('trial_start', {
      package_type: packageType,
      trial_days: trialDays
    });
  }

  /**
   * Track subscription restore
   */
  trackSubscriptionRestore(success) {
    this.logEvent('restore_purchase', {
      success: success
    });
  }

  // ============================================================================
  // FEATURE USAGE EVENTS
  // ============================================================================

  /**
   * Track view change (globe, cluster, etc.)
   */
  trackViewChange(viewType) {
    this.logEvent('view_change', {
      view_type: viewType // 'globe', 'cluster', 'list', etc.
    });
  }

  /**
   * Track notification permission request
   */
  trackNotificationPermissionRequest() {
    this.logEvent('notification_permission_request');
  }

  /**
   * Track notification permission granted
   */
  trackNotificationPermissionGranted() {
    this.logEvent('notification_permission_granted');
  }

  /**
   * Track notification settings change
   */
  trackNotificationSettingsChange(settings) {
    this.logEvent('notification_settings_change', {
      enabled: settings.enabled,
      status_updates: settings.statusUpdates,
      new_members: settings.newMembers,
      location_updates: settings.locationUpdates
    });
  }

  /**
   * Track member profile view
   */
  trackMemberProfileView(memberId) {
    this.logEvent('member_profile_view', {
      member_id: memberId
    });
  }

  /**
   * Track settings open
   */
  trackSettingsOpen() {
    this.logEvent('settings_open');
  }

  // ============================================================================
  // ERROR & PERFORMANCE EVENTS
  // ============================================================================

  /**
   * Track errors
   */
  trackError(errorType, errorMessage, context = {}) {
    this.logEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      ...context
    });
  }

  /**
   * Track page view
   */
  trackPageView(pageName) {
    this.logEvent('page_view', {
      page_name: pageName
    });
  }

  /**
   * Track screen view (for mobile)
   */
  trackScreenView(screenName) {
    this.logEvent('screen_view', {
      screen_name: screenName
    });
  }

  // ============================================================================
  // USER JOURNEY EVENTS
  // ============================================================================

  /**
   * Track onboarding start
   */
  trackOnboardingStart() {
    this.logEvent('onboarding_start');
  }

  /**
   * Track onboarding complete
   */
  trackOnboardingComplete(step) {
    this.logEvent('onboarding_complete', {
      step: step
    });
  }

  /**
   * Track walkthrough view
   */
  trackWalkthroughView() {
    this.logEvent('walkthrough_view');
  }

  /**
   * Track walkthrough complete
   */
  trackWalkthroughComplete() {
    this.logEvent('walkthrough_complete');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Initialize on module load
analyticsService.init();
