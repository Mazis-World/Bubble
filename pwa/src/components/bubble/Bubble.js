import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GlobeView from './GlobeView';
import BubbleCluster from './BubbleCluster';
import SlideUpCard from '../ui/SlideUpCard';
import MemberBubble from '../ui/MemberBubble';
import ProfileView from '../ui/ProfileView';
import ProfileEditForm from '../ui/ProfileEditForm';
import EmojiPicker from '../ui/EmojiPicker';
import LocationStep from '../ui/LocationStep';
import NotificationSettings from '../ui/NotificationSettings';
import BubbleSwitcher from './BubbleSwitcher';
import CreateAnotherBubble from './CreateAnotherBubble';
import BubblePopup from './BubblePopup';
import StatusMediaComposer from '../ui/StatusMediaComposer';
import SosButton from '../sos/SosButton';
import SosConfirmOverlay from '../sos/SosConfirmOverlay';
import SosActiveScreen from '../sos/SosActiveScreen';
import SosAlertScreen from '../sos/SosAlertScreen';
import SosPermissionSheet from '../sos/SosPermissionSheet';
import EmergencyNumberSettings from '../sos/EmergencyNumberSettings';
import PremiumSettings from '../paywall/PremiumSettings';
import BubbleOverviewSheet from './BubbleOverviewSheet';
import PlacesHub from '../places/PlacesHub';
import MapViewBadges from './MapViewBadges';
import AppTour from './AppTour';
import CheckInPopup from './CheckInPopup';
import { ensurePlaceLocationPermission } from '../../services/places/permissions';
import usePlaces from '../../hooks/usePlaces';
import { Circle, Navigation, Plus, Share2, Settings } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { analyticsService } from '../../services/analytics';
import { auth } from '../../firebase';
import { API } from '../../services/bubble';
import useFamilyMemos from '../../hooks/useFamilyMemos';
import { MEMO_TYPE, deleteFamilyMemo, parseMemoDeepLink, toggleMemoReaction, viewerMemoReaction } from '../../services/memos';
import { buildCheckInMemo, canCheckIn, lookupPlaceLabel, readCurrentPosition } from '../../services/checkin';
import { resetAppTour, shouldShowAppTour } from '../../services/appTour';

const Bubble = ({
  bubbleData,
  showStatus,
  setShowStatus,
  showInvite,
  setShowInvite,
  showSettings,
  setShowSettings,
  inviteToken,
  handleStatusChange,
  handleGenerateInvite,
  handlePhotoUpdate,
  handleProfileUpdate,
  onLogout,
  isGeneratingInvite = false,
  userBubbles = [],
  onSwitchBubble,
  showCreateBubble = false,
  setShowCreateBubble,
  creatingBubble = false,
  onCreateAnotherBubble,
  showJoinBubble = false,
  setShowJoinBubble,
  joinCode = '',
  setJoinCode,
  joiningBubble = false,
  onJoinByCode,
  onLeaveBubble,
  leavingBubble = false,
  showCopyMembers = false,
  setShowCopyMembers,
  copyCandidates = [],
  copySourceName = '',
  onOpenCopyMembers,
  onInviteCopiedMembers,
  invitingMembers = false,
  sos = null,
  isSubscribed = false,
  isLapsedSubscriber = false,
  onUpgrade,
  onRestorePurchases,
}) => {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [statusLocation, setStatusLocation] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [selectedStatusEmoji, setSelectedStatusEmoji] = useState(null);
  const [statusMedia, setStatusMedia] = useState({
    photoFile: null,
    photoFiles: [],
    voiceBlob: null,
    voiceDurationMs: null,
    recording: false,
  });
  const [statusPosting, setStatusPosting] = useState(false);
  const [viewMode, setViewMode] = useState('cluster'); // 'cluster' or 'globe' - default to cluster for now
  const [selectedCopyIds, setSelectedCopyIds] = useState([]);
  const currentBubbleId = bubbleData?.bubble?.id;
  const [showOverview, setShowOverview] = useState(false);
  const [showMemos, setShowMemos] = useState(false);
  const [focusedMemoId, setFocusedMemoId] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [checkInState, setCheckInState] = useState('idle');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInMemo, setCheckInMemo] = useState(null);
  const [showPlaces, setShowPlaces] = useState(false);
  const [placesFocusId, setPlacesFocusId] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const openSosIds = useMemo(
    () => (sos?.openEvents || []).map((event) => event.sosId),
    [sos?.openEvents]
  );
  const familyMemos = useFamilyMemos(
    bubbleData?.bubble?.id,
    openSosIds,
    bubbleData?.allMembers || []
  );
  const { places, presence } = usePlaces(bubbleData?.bubble?.id);

  useEffect(() => {
    setSelectedMember(null);
    setShowProfile(false);
    setShowProfileEdit(false);
    setSelectedCopyIds([]);
  }, [currentBubbleId]);

  const currentMemberId = bubbleData?.currentMember?.id;
  useEffect(() => {
    if (!currentMemberId) return undefined;
    if (!shouldShowAppTour()) return undefined;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('place') || params.get('memo') || params.get('join')) return undefined;
    } catch (error) {
      // ignore
    }
    const timer = window.setTimeout(() => setShowTour(true), 450);
    return () => window.clearTimeout(timer);
  }, [currentMemberId]);

  const handleTourStep = useCallback((step) => {
    if (step?.viewMode) setViewMode(step.viewMode);
  }, []);

  const replayTour = useCallback(() => {
    resetAppTour();
    setShowSettings(false);
    setShowOverview(false);
    setShowMemos(false);
    setShowPlaces(false);
    setShowStatus(false);
    window.setTimeout(() => setShowTour(true), 280);
  }, [setShowSettings, setShowStatus]);

  const openPlaces = useCallback((placeId = null) => {
    setPlacesFocusId(placeId);
    setShowPlaces(true);
    ensurePlaceLocationPermission();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const placeId = params.get('place');
      if (placeId) {
        openPlaces(placeId);
      }
      const memoId = parseMemoDeepLink(window.location.search)
        || localStorage.getItem('familyBubble_pendingMemo');
      if (memoId) {
        setFocusedMemoId(memoId);
        setShowMemos(true);
        localStorage.removeItem('familyBubble_pendingMemo');
      }
    } catch (error) {
      // ignore malformed URLs
    }
  }, [openPlaces]);

  const resetStatusSheet = () => {
    setShowStatus(false);
    setStatusLocation(null);
    setStatusText('');
    setSelectedStatusEmoji(null);
    setStatusMedia({
      photoFile: null,
      photoFiles: [],
      voiceBlob: null,
      voiceDurationMs: null,
      recording: false,
    });
    setStatusPosting(false);
  };

  const submitStatus = async () => {
    if (statusPosting || statusMedia.recording) return;
    setStatusPosting(true);
    try {
      const emoji = selectedStatusEmoji || bubbleData?.currentMember?.status || '😊';
      await handleStatusChange(emoji, statusLocation, statusText, statusMedia);
      resetStatusSheet();
    } catch (error) {
      setStatusPosting(false);
      alert(error.message || 'Could not update status.');
    }
  };

  const handleShare = async () => {
    if (!inviteToken || inviteToken === 'Generating...') return;

    // Create shareable URL (optimize string operations)
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const shareUrl = `${origin}${pathname}?join=${inviteToken}`;
    const bubbleName = bubbleData?.bubble?.name || 'my bubble';
    const shareText = `Join my family bubble "${bubbleName}" on FamilyBubble!\n\nUse invite code: ${inviteToken}\n\nOr click this link: ${shareUrl}`;
    const shareTitle = `Join ${bubbleName} on FamilyBubble`;

    // Try Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000); // Reduced timeout
        return;
      } catch (error) {
        // User cancelled or share failed, fall through to clipboard
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        } else {
          return; // User cancelled, don't fall through
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000); // Reduced timeout
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to share. Please copy the code manually.');
    }
  };

  const handleCheckIn = async () => {
    const bubbleId = bubbleData?.bubble?.id;
    const nodeId = bubbleData?.currentMember?.id;
    const uid = auth.currentUser?.uid;
    setViewMode('globe');
    setShowCheckIn(true);
    if (
      checkInState === 'busy'
      || checkInState === 'done'
      || !bubbleId
      || !nodeId
      || !canCheckIn({ authUid: uid, userId: uid, isBubbleMember: true })
    ) {
      return;
    }

    setCheckInState('busy');
    setCheckInMemo(null);
    try {
      const location = await readCurrentPosition();
      const address = await lookupPlaceLabel(location.latitude, location.longitude);
      const checkInLocation = address ? { ...location, address } : location;
      await API.checkIn(bubbleId, nodeId, checkInLocation);
      analyticsService.trackCheckIn(bubbleId, true);
      setMapFocus({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setCheckInMemo({
        ...buildCheckInMemo({ location: checkInLocation }),
        createdAt: Date.now(),
      });
      setCheckInState('done');
    } catch (error) {
      console.error('Check-in failed:', error);
      analyticsService.trackCheckIn(bubbleId, false);
      setCheckInState('error');
    }
  };

  const closeCheckIn = () => {
    if (checkInState === 'busy') return;
    setShowCheckIn(false);
    setCheckInState('idle');
  };

  const handleMemoReact = useCallback(async (memo, emoji) => {
    const bubbleId = bubbleData?.bubble?.id;
    const uid = auth.currentUser?.uid;
    if (!bubbleId || !memo?.memoId || !uid) return;
    try {
      await toggleMemoReaction({
        bubbleId,
        memoId: memo.memoId,
        emoji,
        currentEmoji: viewerMemoReaction(memo.reactions, uid),
      });
    } catch (error) {
      console.warn('Memo reaction failed:', error);
    }
  }, [bubbleData?.bubble?.id]);

  const handleMemoDelete = useCallback(async (memo) => {
    const bubbleId = bubbleData?.bubble?.id;
    if (!bubbleId || !memo?.memoId) return;
    try {
      await deleteFamilyMemo({
        bubbleId,
        memoId: memo.memoId,
        userId: memo.userId,
      });
    } catch (error) {
      console.warn('Memo delete failed:', error);
      alert(error.message || 'Could not delete that memo.');
    }
  }, [bubbleData?.bubble?.id]);

  if (!bubbleData || !bubbleData.currentMember) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        <div className="text-center space-y-4 relative z-10">
          <div className="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto glow-purple"></div>
          <p className="text-gray-300 font-semibold">Loading your bubble...</p>
        </div>
      </div>
    );
  }

  const viewBadges = (
    <MapViewBadges
      memberCount={bubbleData.allMembers.length}
      memoCount={familyMemos.length}
      checkInState={checkInState}
      onMemberCountClick={() => setShowOverview(true)}
      onMemosClick={() => setShowMemos(true)}
      onCheckIn={handleCheckIn}
      onPlacesClick={() => openPlaces()}
    />
  );

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden flex flex-col safe-area-insets" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      {/* Modern animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-30 safe-area-top flex-shrink-0" style={{ 
        borderTopLeftRadius: '1.5rem',
        borderTopRightRadius: '1.5rem',
        overflow: 'hidden',
      }}>
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between sm:glass-strong sm:border-b sm:border-white/10" style={{ 
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg glow-purple">
              <Circle size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg gradient-text whitespace-nowrap">FamilyBubble</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* View Toggle - Modern glassmorphic design */}
          <div className="flex items-center gap-0.5 sm:gap-1 glass-light rounded-2xl p-1 sm:p-1.5">
              <button
                onClick={() => {
                  setViewMode('cluster');
                  analyticsService.trackViewChange('cluster');
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm ${
                  viewMode === 'cluster'
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg glow-blue scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                title="Cluster View"
              >
                <span className="text-sm sm:text-base">👥</span>
                <span className="hidden sm:inline">Bubbles</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('globe');
                  analyticsService.trackViewChange('globe');
                }}
                data-tour="globe"
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm ${
                  viewMode === 'globe'
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg glow-blue scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                title="Globe View"
              >
                <span className="text-sm sm:text-base">🌍</span>
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          <button
            onClick={() => {
              setShowSettings(true);
              analyticsService.trackSettingsOpen();
            }}
            className="flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300 p-1.5 sm:p-2 glass-light hover:bg-white/10 rounded-xl active:scale-95"
          >
            <Settings size={18} className="sm:w-5 sm:h-5" />
          </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-hidden relative flex items-center justify-center" style={{ minHeight: 0 }}>
        {viewMode === 'globe' ? (
          <GlobeView
            bubbleData={bubbleData}
            focusTarget={mapFocus}
            checkInOpen={showCheckIn}
            overlay={viewBadges}
            places={places}
            presence={presence}
            onPlaceClick={(place) => openPlaces(place?.placeId)}
            onMemberClick={(member) => {
              setSelectedMember(member);
              setShowProfile(true);
              analyticsService.trackMemberProfileView(member.id);
            }}
          />
        ) : (
          <BubbleCluster
            bubbleData={bubbleData}
            overlay={viewBadges}
            places={places}
            presence={presence}
            onPlaceClick={(place) => openPlaces(place?.placeId)}
            onStatusClick={() => setShowStatus(true)}
            onMemberClick={(member) => {
              setSelectedMember(member);
              setShowProfile(true);
              analyticsService.trackMemberProfileView(member.id);
            }}
          />
        )}
      </div>

      <div className="relative z-30 flex-shrink-0 -mt-5 -mb-3">
        <BubbleSwitcher
          bubbles={(userBubbles.length ? userBubbles : [{
            id: currentBubbleId,
            name: bubbleData?.bubble?.name || 'FamilyBubble',
            members: bubbleData?.allMembers || [],
          }]).map((bubble) => (
            bubble.id === currentBubbleId
              ? { ...bubble, members: bubbleData?.allMembers || bubble.members || [] }
              : bubble
          ))}
          currentId={currentBubbleId}
          onSwitch={onSwitchBubble}
          onCreate={setShowCreateBubble ? () => setShowCreateBubble(true) : undefined}
        />
      </div>

      <div className="px-4 sm:px-6 pt-5 pb-12 sm:pb-8 safe-area-bottom z-20 flex-shrink-0" style={{ 
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}>
        <div className="max-w-md mx-auto glass-strong rounded-3xl p-3 sm:p-4 border border-white/10 shadow-2xl space-y-3">
          {sos && (
            <SosButton
              onHoldComplete={sos.handleHoldComplete}
              disabled={sos.busy || sos.sosActive}
              locked={!isSubscribed}
              onLockedPress={onUpgrade}
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => setShowStatus(true)}
              data-tour="status"
              className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 hover:from-blue-400 hover:via-blue-500 hover:to-purple-500 text-white py-4 sm:py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg glow-blue hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] tap-target text-sm sm:text-base relative overflow-hidden group"
            >
              <span className="relative z-10">Update Status</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button
              onClick={handleGenerateInvite}
              disabled={isGeneratingInvite}
              data-tour="invite"
              className="bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 hover:from-purple-400 hover:via-pink-400 hover:to-blue-400 text-white py-4 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg glow-purple hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 tap-target text-sm sm:text-base relative overflow-hidden group disabled:opacity-70 disabled:cursor-wait"
            >
              {isGeneratingInvite ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                  <span className="relative z-10">Generating...</span>
                </>
              ) : (
                <>
                  <Plus size={18} className="sm:w-5 sm:h-5 relative z-10" />
                  <span className="relative z-10">Invite</span>
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SlideUpCard 
        isOpen={showStatus} 
        onClose={resetStatusSheet}
        title="Update Your Status"
      >
        <div className="w-full space-y-3">
          <div>
            <p className="text-gray-300 text-sm mb-1.5 font-semibold">Choose your status emoji:</p>
            <EmojiPicker
              selectedEmoji={selectedStatusEmoji || bubbleData?.currentMember?.status}
              onSelect={(emoji) => {
                setSelectedStatusEmoji(emoji);
              }}
            />
          </div>
          
          <div className="border-t border-gray-800 pt-2.5">
            <p className="text-gray-300 text-sm mb-2 font-semibold">Add a quick message (optional):</p>
            <div className="relative">
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={100}
                autoComplete="off"
                disabled={statusPosting}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base tap-target disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {statusText.length}/100
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-2.5">
            {showStatus && (
              <StatusMediaComposer
                disabled={statusPosting}
                onChange={setStatusMedia}
              />
            )}
          </div>
          
          <div className="border-t border-gray-800 pt-4">
            <p className="text-gray-300 text-sm mb-3 font-semibold">Update your location (optional):</p>
            {showStatus && (
              <LocationStep
                onLocationSet={(loc) => {
                  setStatusLocation(loc);
                }}
                initialLocation={bubbleData?.currentMember?.lastKnownLocation}
              />
            )}
          </div>
          
          <button
            type="button"
            onClick={submitStatus}
            disabled={statusPosting || statusMedia.recording}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 text-white py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-lg glow-blue hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] tap-target relative overflow-hidden group disabled:opacity-60 disabled:hover:scale-100"
          >
            <span className="relative z-10">
              {statusPosting ? 'Posting…' : statusMedia.recording ? 'Stop recording first' : 'Update Status'}
            </span>
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-3 text-center font-medium">
          Everyone in your bubble will see your status, photos, and voice memos
        </p>
      </SlideUpCard>

      <SlideUpCard 
        isOpen={showInvite} 
        onClose={() => setShowInvite(false)}
        title="Invite Someone to Your Bubble"
      >
        <p className="text-gray-300 mb-6 font-medium">Share this code to add someone to <strong className="gradient-text">{bubbleData?.bubble.name}</strong>:</p>
        <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6 rounded-3xl mb-6 text-center shadow-2xl glow-blue relative overflow-hidden">
          {inviteToken === 'Generating...' ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <code className="text-xl font-mono font-bold text-white">Generating code...</code>
            </div>
          ) : (
            <>
              <code className="text-3xl font-mono font-bold text-white relative z-10">{inviteToken}</code>
              <div className="absolute inset-0 shimmer"></div>
            </>
          )}
        </div>
        <div className="glass-light border border-white/10 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-100 leading-relaxed font-medium">
            <strong className="text-white font-bold">Important:</strong> When they join, they'll see <strong className="text-white">everyone</strong> in this bubble, 
            and everyone will see them. This is a shared space—not separate networks.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!inviteToken || inviteToken === 'Generating...') return;
              try {
                await navigator.clipboard.writeText(inviteToken);
                setShareSuccess(true);
                setTimeout(() => setShareSuccess(false), 3000);
              } catch (error) {
                console.error('Error copying code:', error);
                alert('Failed to copy code. Please try again.');
              }
            }}
            disabled={!inviteToken || inviteToken === 'Generating...'}
            className="flex-1 bg-gray-800 border border-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 active:bg-gray-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed tap-target"
          >
            {shareSuccess ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleShare}
            disabled={!inviteToken || inviteToken === 'Generating...'}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-2xl font-bold hover:from-blue-400 hover:to-purple-400 active:scale-[0.98] transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg glow-blue hover:shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed tap-target"
          >
            <Share2 size={18} />
            {shareSuccess ? 'Shared!' : 'Share'}
          </button>
        </div>
      </SlideUpCard>
      
      <SlideUpCard
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setPhotoPreview(null);
        }}
        title="Settings & Profile"
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <MemberBubble 
              member={{
                ...bubbleData.currentMember,
                photoUrl: photoPreview || bubbleData.currentMember.photoUrl
              }} 
              isCenter={true} 
            />
            {photoUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-white mt-4">{bubbleData.currentMember.name}</h3>
          <p className="text-gray-400 capitalize">{bubbleData.currentMember.role}</p>
          
          {/* Photo Upload */}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="profile-photo-upload"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              
              try {
                // Compress image
                const compressedFile = await imageCompression(file, {
                  maxSizeMB: 0.25,
                  maxWidthOrHeight: 384,
                  useWebWorker: true
                });
                
                // Show preview
                const previewUrl = URL.createObjectURL(compressedFile);
                setPhotoPreview(previewUrl);
                
                // Upload photo
                setPhotoUploading(true);
                await handlePhotoUpdate(compressedFile);
                setPhotoUploading(false);
                
                // Clear preview after a moment
                setTimeout(() => {
                  setPhotoPreview(null);
                }, 1000);
              } catch (error) {
                console.error("Error updating photo:", error);
                setPhotoUploading(false);
                setPhotoPreview(null);
                alert(`Failed to update photo: ${error.message}`);
              }
            }}
          />
          <label
            htmlFor="profile-photo-upload"
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ pointerEvents: photoUploading ? 'none' : 'auto' }}
          >
            {photoUploading ? 'Uploading...' : 'Change Photo'}
          </label>
        </div>
        <div className="my-6 border-t border-gray-800" />
        
        {/* Profile Edit Section */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Edit Profile</h4>
          <button
            onClick={() => {
              setShowSettings(false);
              setShowProfileEdit(true);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all"
          >
            Edit Profile Details
          </button>
        </div>
        
        <div className="my-6 border-t border-gray-800" />

        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Your bubbles</h4>
          <p className="text-gray-400 text-sm">
            Swipe the glowing control between the radar and Update Status to switch families. You can be in two bubbles.
          </p>
          <div className="space-y-2">
            {(userBubbles.length ? userBubbles : [{
              id: currentBubbleId,
              name: bubbleData?.bubble?.name || 'Family bubble',
            }]).map((bubble) => (
              <button
                key={bubble.id}
                type="button"
                onClick={() => {
                  if (bubble.id !== currentBubbleId && onSwitchBubble) {
                    onSwitchBubble(bubble.id);
                    setShowSettings(false);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                  bubble.id === currentBubbleId
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
                }`}
              >
                {bubble.name}
              </button>
            ))}
          </div>
          {userBubbles.length < 2 ? (
            <button
              type="button"
              onClick={() => {
                setShowSettings(false);
                if (setShowCreateBubble) setShowCreateBubble(true);
              }}
              className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20"
            >
              Create another bubble
            </button>
          ) : (
            <p className="text-gray-500 text-xs text-center">You’re in 2 bubbles. Leave one to create or join another.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setShowSettings(false);
              if (setShowJoinBubble) setShowJoinBubble(true);
            }}
            className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20"
          >
            Join a bubble by code
          </button>
          {userBubbles.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowSettings(false);
                if (onOpenCopyMembers) onOpenCopyMembers();
              }}
              className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20"
            >
              Add members from another bubble
            </button>
          )}
          <button
            type="button"
            onClick={onLeaveBubble}
            disabled={leavingBubble}
            className="w-full bg-rose-900/40 border border-rose-500/40 text-rose-100 py-3 rounded-xl font-semibold hover:bg-rose-900/60 disabled:opacity-50"
          >
            {leavingBubble ? 'Leaving…' : 'Leave this bubble'}
          </button>
        </div>

        <div className="my-6 border-t border-gray-800" />

        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Navigation size={16} />
            Places
          </h4>
          <p className="text-gray-400 text-sm">
            Save Home, School, or Work and FamilyBubble can let family know when you arrive or leave.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSettings(false);
              openPlaces();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all"
          >
            Open Places
          </button>
        </div>
        
        <div className="my-6 border-t border-gray-800" />
        
        {/* Notification Settings */}
        <NotificationSettings />

        <div className="my-6 border-t border-gray-800" />
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Help</h4>
          <p className="text-gray-400 text-sm">
            Replay the little tour that points at Check in, Status, Memos, and the globe.
          </p>
          <button
            type="button"
            onClick={replayTour}
            className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20"
          >
            Show the button tour
          </button>
        </div>
        
        <div className="my-6 border-t border-gray-800" />
        <PremiumSettings
          isSubscribed={isSubscribed}
          isLapsedSubscriber={isLapsedSubscriber}
          onUpgrade={onUpgrade}
          onRestorePurchases={onRestorePurchases}
        />
        
        <div className="my-6 border-t border-gray-800" />
        <EmergencyNumberSettings />
        
        <div className="border-t border-gray-800 mt-6" />
        <div className="space-y-3 mt-6">
          <button
            onClick={onLogout}
            className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 active:bg-gray-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign Out
          </button>
        </div>
      </SlideUpCard>

      <BubblePopup
        isOpen={showCreateBubble}
        onClose={() => setShowCreateBubble && setShowCreateBubble(false)}
        title="Create another bubble"
      >
        <CreateAnotherBubble
          needProfileNames={!bubbleData?.currentMember?.name}
          submitting={creatingBubble}
          onSubmit={onCreateAnotherBubble}
          onCancel={() => setShowCreateBubble && setShowCreateBubble(false)}
        />
      </BubblePopup>

      <BubblePopup
        isOpen={showJoinBubble}
        onClose={() => setShowJoinBubble && setShowJoinBubble(false)}
        title="Join a bubble"
      >
        <p className="text-gray-400 text-sm mb-3">
          Paste an invite code. If you opened a FamilyBubble link, the code is filled in for you.
        </p>
        <input
          type="text"
          placeholder="BUBXXXXXXXX"
          value={joinCode}
          onChange={(event) => setJoinCode && setJoinCode(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          aria-label="Invite code"
          className="w-full text-center font-mono tracking-widest px-4 py-3 mb-3 bg-gray-900 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500"
        />
        <button
          type="button"
          onClick={() => onJoinByCode && onJoinByCode(joinCode)}
          disabled={joiningBubble || String(joinCode || '').trim().length < 3}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {joiningBubble ? 'Joining…' : 'Join bubble'}
        </button>
      </BubblePopup>

      <BubblePopup
        isOpen={showCopyMembers}
        onClose={() => setShowCopyMembers && setShowCopyMembers(false)}
        title="Add members from another bubble"
      >
        <p className="text-gray-400 text-sm mb-3">
          Choose people from {copySourceName || 'your other family'} to invite into this bubble.
        </p>
        {copyCandidates.length === 0 ? (
          <p className="text-gray-500 text-sm mb-3">Everyone from that bubble is already here.</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
            {copyCandidates.map((member) => {
              const checked = selectedCopyIds.includes(member.userId);
              return (
                <label
                  key={member.userId}
                  className="flex items-center gap-3 bg-gray-900/60 border border-gray-700 rounded-xl px-3 py-2 text-white"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedCopyIds((current) => (
                        checked
                          ? current.filter((id) => id !== member.userId)
                          : [...current, member.userId]
                      ));
                    }}
                  />
                  <span>{member.name || 'Family member'}</span>
                </label>
              );
            })}
          </div>
        )}
        <button
          type="button"
          disabled={invitingMembers || selectedCopyIds.length === 0}
          onClick={() => onInviteCopiedMembers && onInviteCopiedMembers(selectedCopyIds)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {invitingMembers ? 'Sending invites…' : 'Send invites'}
        </button>
      </BubblePopup>

      <SlideUpCard
        isOpen={showPlaces}
        onClose={() => {
          setShowPlaces(false);
          setPlacesFocusId(null);
        }}
        title="Places"
      >
        <PlacesHub
          bubbleId={bubbleData?.bubble?.id}
          members={bubbleData?.allMembers || []}
          currentMember={bubbleData?.currentMember}
          initialPlaceId={placesFocusId}
          isPremium={isSubscribed}
          onUpgrade={onUpgrade}
          onClose={() => {
            setShowPlaces(false);
            setPlacesFocusId(null);
          }}
        />
      </SlideUpCard>


      {/* Profile View Modal */}
      {showProfile && selectedMember && (
        <ProfileView
          member={
            bubbleData?.allMembers?.find((item) => item.id === selectedMember.id)
            || selectedMember
          }
          isCurrentUser={selectedMember.id === bubbleData?.currentMember?.id}
          currentUserLocation={bubbleData?.currentMember?.lastKnownLocation}
          onClose={() => {
            setShowProfile(false);
            setSelectedMember(null);
          }}
          onEdit={() => {
            setShowProfile(false);
            setShowProfileEdit(true);
            setSelectedMember(bubbleData.currentMember);
          }}
        />
      )}

      {/* Profile Edit Modal */}
      <SlideUpCard
        isOpen={showProfileEdit}
        onClose={() => {
          setShowProfileEdit(false);
          setSelectedMember(null);
        }}
        title="Edit Profile"
      >
        <ProfileEditForm
          member={selectedMember || bubbleData?.currentMember}
          bubbleId={bubbleData?.bubble?.id}
          onSave={async (updatedData) => {
            if (handleProfileUpdate) {
              await handleProfileUpdate(updatedData);
              setShowProfileEdit(false);
              setSelectedMember(null);
            }
          }}
        />
      </SlideUpCard>

      <SlideUpCard
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        title={bubbleData?.bubble?.name || 'Members'}
      >
        <BubbleOverviewSheet
          section="members"
          members={bubbleData.allMembers}
          onMemberClick={(member) => {
            setShowOverview(false);
            setSelectedMember(member);
            setShowProfile(true);
            analyticsService.trackMemberProfileView(member.id);
          }}
        />
      </SlideUpCard>

      <SlideUpCard
        isOpen={showMemos}
        onClose={() => {
          setShowMemos(false);
          setFocusedMemoId(null);
        }}
        title="Family Memos"
      >
        <BubbleOverviewSheet
          section="memos"
          members={bubbleData.allMembers}
          memos={familyMemos}
          bubbleName={bubbleData?.bubble?.name}
          bubbleId={bubbleData?.bubble?.id}
          currentUserId={auth.currentUser?.uid || bubbleData.currentMember.userId}
          focusedMemoId={focusedMemoId}
          onMemoReact={handleMemoReact}
          onMemoDelete={handleMemoDelete}
          onMemoClick={(memo) => {
            setShowMemos(false);
            const member = bubbleData.allMembers.find(
              (item) => item.userId === memo.userId || item.id === memo.nodeId
            );
            const location = memo.location || member?.lastKnownLocation;
            setViewMode('globe');
            if (location?.latitude != null && location?.longitude != null) {
              setMapFocus({
                latitude: location.latitude,
                longitude: location.longitude,
              });
            }
            if (memo.type === MEMO_TYPE.SOS && memo.sosId && sos?.focusSos) {
              sos.focusSos(memo.sosId);
            }
          }}
        />
      </SlideUpCard>

      <CheckInPopup
        open={showCheckIn}
        state={checkInState}
        member={bubbleData.currentMember}
        memo={checkInMemo || familyMemos.find((memo) => (
          memo.type === MEMO_TYPE.CHECKIN
          && (memo.userId === bubbleData.currentMember.userId || memo.nodeId === bubbleData.currentMember.id)
        ))}
        onConfirm={handleCheckIn}
        onClose={closeCheckIn}
      />

      {sos && (
        <>
          <SosConfirmOverlay
            open={sos.showConfirm}
            onConfirm={sos.activateAfterConfirm}
            onCancel={sos.cancelConfirm}
          />
          <SosPermissionSheet
            reason={sos.permissionReason}
            enabling={sos.enablingLocation}
            onEnable={sos.handleEnableLocation}
            onContinueWithout={sos.continueWithoutLocation}
            onClose={sos.closePermission}
          />
          {sos.showActiveScreen && (
            <SosActiveScreen
              sos={sos.ownOpenSos}
              deliveryState={sos.deliveryState}
              locationError={sos.locationError}
              onResolve={sos.handleResolve}
              onCancel={sos.handleCancel}
              resolving={sos.busy}
            />
          )}
          {sos.incomingSos && (
            <SosAlertScreen
              sos={sos.incomingSos}
              member={sos.memberForSos(sos.incomingSos)}
              acknowledgedByName={sos.acknowledgedByName}
              onAcknowledge={sos.handleAcknowledge}
              acknowledging={sos.busy}
              onClose={sos.closeIncoming}
              onMuteSound={sos.muteAlertSound}
            />
          )}
        </>
      )}

      <AppTour
        open={showTour}
        onClose={() => setShowTour(false)}
        onStep={handleTourStep}
      />

    </div>
  );
};

export default Bubble;