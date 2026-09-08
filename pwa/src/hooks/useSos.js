import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  acknowledgeSos,
  activateSos,
  cancelSos,
  consumePendingDeepLink,
  flushPendingSos,
  getCurrentPosition,
  listenToOpenSosEvents,
  persistPendingDeepLink,
  queryGeolocationPermission,
  resolveSos,
  startSosLocationWatch,
  shouldNotifySosRecipient,
  shouldWatchLocationForSos,
} from '../services/sos';
import { notificationService } from '../services/notifications';
import { analyticsService } from '../services/analytics';

const locationErrorCopy = {
  permission_denied: 'Location permission is required to send your location with an SOS.',
  gps_unavailable: 'GPS unavailable. Alert can still be sent without a pin.',
  gps_timeout: 'GPS timed out. Trying without a live pin.',
  location_failed: 'Could not read GPS.',
};

/**
 * Owns SOS listeners, live GPS (only while an SOS is open), offline retry,
 * and deep-link focus. Idle 15-minute location updates stay in MainApp.
 */
export default function useSos({ userId, bubbleData, initialSosLink = null }) {
  const [openEvents, setOpenEvents] = useState([]);
  const [focusedSosId, setFocusedSosId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [permissionReason, setPermissionReason] = useState(null);
  const [enablingLocation, setEnablingLocation] = useState(false);
  const [deliveryState, setDeliveryState] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [queuedLocalSos, setQueuedLocalSos] = useState(false);
  const notifiedIdsRef = useRef(new Set());
  const watchCleanupRef = useRef(null);
  const pendingActivateRef = useRef(null);

  const bubbleId = bubbleData?.bubble?.id;
  const nodeId = bubbleData?.currentMember?.id;
  const members = bubbleData?.allMembers || [];
  const membersRef = useRef(members);
  membersRef.current = members;

  const ownOpenSos = useMemo(
    () => openEvents.find((event) => event.userId === userId) || null,
    [openEvents, userId]
  );

  const focusedSos = useMemo(() => {
    if (focusedSosId) {
      return openEvents.find((event) => event.sosId === focusedSosId) || ownOpenSos;
    }
    return ownOpenSos;
  }, [openEvents, focusedSosId, userId, ownOpenSos]);

  const memberForSos = (sos) =>
    members.find((member) => member.userId === sos?.userId || member.id === sos?.nodeId);

  useEffect(() => {
    const fromUrl = typeof window !== 'undefined'
      ? (() => {
          const params = new URLSearchParams(window.location.search);
          const sosId = params.get('sos');
          const linkBubble = params.get('bubble');
          return sosId && linkBubble ? { sosId, bubbleId: linkBubble } : null;
        })()
      : null;
    const stored = consumePendingDeepLink();
    const link = initialSosLink || fromUrl || stored;
    if (fromUrl) {
      persistPendingDeepLink(fromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (link?.sosId) setFocusedSosId(link.sosId);
  }, [initialSosLink]);

  useEffect(() => {
    if (!bubbleId) return undefined;
    return listenToOpenSosEvents(bubbleId, (events) => {
      setOpenEvents(events);
      events.forEach((sos) => {
        if (!shouldNotifySosRecipient({ viewerUid: userId, sosUserId: sos.userId })) return;
        if (notifiedIdsRef.current.has(sos.sosId)) return;
        notifiedIdsRef.current.add(sos.sosId);
        const member = membersRef.current.find((item) => item.userId === sos.userId);
        notifiedIdsRef.current.add(sos.sosId);
        setFocusedSosId((current) => current || sos.sosId);
        notificationService.notifySosAlert(member, sos, () => setFocusedSosId(sos.sosId));
      });
    });
  }, [bubbleId, userId]);

  useEffect(() => {
    watchCleanupRef.current?.();
    watchCleanupRef.current = null;
    if (!ownOpenSos || !shouldWatchLocationForSos({ authUid: userId, sos: ownOpenSos })) {
      return undefined;
    }
    watchCleanupRef.current = startSosLocationWatch({
      bubbleId,
      sosId: ownOpenSos.sosId,
      nodeId,
      onError: (error) => {
        if (error?.code === 'permission_denied' || error?.code === 1) {
          setLocationError(locationErrorCopy.permission_denied);
        }
      },
    });
    return () => {
      watchCleanupRef.current?.();
      watchCleanupRef.current = null;
    };
  }, [ownOpenSos?.sosId, ownOpenSos?.status, bubbleId, nodeId, userId]);

  useEffect(() => {
    const flush = () => {
      flushPendingSos()
        .then((sent) => {
          if (sent.length) {
            setQueuedLocalSos(false);
            setDeliveryState('delivered');
          }
        })
        .catch(() => {});
    };
    flush();
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const sendSos = useCallback(async (location = null) => {
    if (!bubbleId || !userId) return;
    setBusy(true);
    setShowConfirm(false);
    setPermissionReason(null);
    setDeliveryState('sending');
    setQueuedLocalSos(false);
    try {
      const result = await activateSos({ bubbleId, userId, nodeId, location });
      if (result.delivered && result.sos) {
        setDeliveryState('delivered');
        setFocusedSosId(result.sos.sosId);
        setQueuedLocalSos(false);
        analyticsService.trackSosActivate(bubbleId, result.duplicate === true);
      } else if (result.queued) {
        setDeliveryState('queued');
        setQueuedLocalSos(true);
      } else {
        setDeliveryState('failed');
      }
    } catch (error) {
      console.error('SOS activate failed:', error);
      setDeliveryState('failed');
    } finally {
      setBusy(false);
      pendingActivateRef.current = null;
    }
  }, [bubbleId, userId, nodeId]);

  const activateAfterConfirm = useCallback(async () => {
    setShowConfirm(false);
    const permission = await queryGeolocationPermission();
    if (permission === 'denied') {
      setPermissionReason('denied');
      pendingActivateRef.current = true;
      return;
    }

    let location = null;
    try {
      location = await getCurrentPosition();
      setLocationError(null);
    } catch (error) {
      const code = error.code || 'location_failed';
      if (code === 'permission_denied') {
        setPermissionReason('denied');
        pendingActivateRef.current = true;
        return;
      }
      setLocationError(locationErrorCopy[code] || locationErrorCopy.location_failed);
      if (code === 'gps_unavailable') {
        setPermissionReason('gps_unavailable');
        pendingActivateRef.current = { location: null };
        return;
      }
    }
    await sendSos(location);
  }, [sendSos]);

  const handleHoldComplete = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleEnableLocation = useCallback(async () => {
    setEnablingLocation(true);
    try {
      const location = await getCurrentPosition();
      setPermissionReason(null);
      setLocationError(null);
      await sendSos(location);
    } catch (error) {
      const code = error.code || 'permission_denied';
      setPermissionReason(code === 'gps_unavailable' ? 'gps_unavailable' : 'denied');
    } finally {
      setEnablingLocation(false);
    }
  }, [sendSos]);

  const handleAcknowledge = useCallback(async () => {
    if (!bubbleId || !focusedSos) return;
    setBusy(true);
    try {
      await acknowledgeSos({ bubbleId, sosId: focusedSos.sosId });
      analyticsService.trackSosAcknowledge(bubbleId);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }, [bubbleId, focusedSos]);

  const handleResolve = useCallback(async () => {
    if (!bubbleId || !ownOpenSos) return;
    setBusy(true);
    try {
      await resolveSos({ bubbleId, sosId: ownOpenSos.sosId, nodeId });
      analyticsService.trackSosResolve(bubbleId);
      setFocusedSosId(null);
      setDeliveryState(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }, [bubbleId, ownOpenSos, nodeId]);

  const handleCancel = useCallback(async () => {
    if (!bubbleId || !ownOpenSos) return;
    setBusy(true);
    try {
      await cancelSos({ bubbleId, sosId: ownOpenSos.sosId, nodeId });
      analyticsService.trackSosCancel(bubbleId);
      setFocusedSosId(null);
      setDeliveryState(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }, [bubbleId, ownOpenSos, nodeId]);

  const showActiveScreen = Boolean(ownOpenSos || queuedLocalSos || deliveryState === 'sending' || deliveryState === 'queued');
  const incomingSos = focusedSos && focusedSos.userId !== userId ? focusedSos : null;

  return {
    openEvents,
    ownOpenSos,
    incomingSos,
    showActiveScreen,
    showConfirm,
    permissionReason,
    enablingLocation,
    deliveryState: ownOpenSos?.delivered ? 'delivered' : deliveryState,
    locationError,
    busy,
    sosActive: Boolean(ownOpenSos),
    handleHoldComplete,
    activateAfterConfirm,
    cancelConfirm: () => setShowConfirm(false),
    handleEnableLocation,
    continueWithoutLocation: () => sendSos(null),
    closePermission: () => {
      setPermissionReason(null);
      pendingActivateRef.current = null;
    },
    handleAcknowledge,
    handleResolve,
    handleCancel,
    closeIncoming: () => setFocusedSosId(null),
    memberForSos,
    acknowledgedByName: incomingSos
      ? members.find((member) => member.userId === incomingSos.acknowledgedBy)?.name
      : null,
  };
}
