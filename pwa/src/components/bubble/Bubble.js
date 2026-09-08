import React, { useState } from 'react';
import GlobeView from './GlobeView';
import BubbleCluster from './BubbleCluster';
import SlideUpCard from '../ui/SlideUpCard';
import MemberBubble from '../ui/MemberBubble';
import ProfileView from '../ui/ProfileView';
import ProfileEditForm from '../ui/ProfileEditForm';
import EmojiPicker from '../ui/EmojiPicker';
import LocationStep from '../ui/LocationStep';
import NotificationSettings from '../ui/NotificationSettings';
import SosButton from '../sos/SosButton';
import SosConfirmOverlay from '../sos/SosConfirmOverlay';
import SosActiveScreen from '../sos/SosActiveScreen';
import SosAlertScreen from '../sos/SosAlertScreen';
import SosPermissionSheet from '../sos/SosPermissionSheet';
import EmergencyNumberSettings from '../sos/EmergencyNumberSettings';
import { Circle, Plus, Share2, Settings } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { analyticsService } from '../../services/analytics';

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
  sos = null,
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
  const [viewMode, setViewMode] = useState('cluster'); // 'cluster' or 'globe' - default to cluster for now

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
          )}
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
            onMemberClick={(member) => {
              setSelectedMember(member);
              setShowProfile(true);
              analyticsService.trackMemberProfileView(member.id);
            }}
          />
        ) : (
          <BubbleCluster
            bubbleData={bubbleData}
            onStatusClick={() => setShowStatus(true)}
            onMemberClick={(member) => {
              setSelectedMember(member);
              setShowProfile(true);
              analyticsService.trackMemberProfileView(member.id);
            }}
          />
        )}
      </div>

      <div className="p-4 sm:p-6 pb-12 sm:pb-8 safe-area-bottom z-20 flex-shrink-0" style={{ 
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}>
        <div className="max-w-md mx-auto glass-strong rounded-3xl p-3 sm:p-4 border border-white/10 shadow-2xl space-y-3">
          {sos && (
            <SosButton
              onHoldComplete={sos.handleHoldComplete}
              disabled={sos.busy || sos.sosActive}
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => setShowStatus(true)}
              className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 hover:from-blue-400 hover:via-blue-500 hover:to-purple-500 text-white py-4 sm:py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg glow-blue hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] tap-target text-sm sm:text-base relative overflow-hidden group"
            >
              <span className="relative z-10">Update Status</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button
              onClick={handleGenerateInvite}
              disabled={isGeneratingInvite}
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
        onClose={() => {
          setShowStatus(false);
          setStatusLocation(null);
          setStatusText('');
          setSelectedStatusEmoji(null);
        }}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base tap-target"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {statusText.length}/100
              </div>
            </div>
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
            onClick={() => {
              const emoji = selectedStatusEmoji || bubbleData?.currentMember?.status || '😊';
              handleStatusChange(emoji, statusLocation, statusText);
              setShowStatus(false);
              setStatusLocation(null);
              setStatusText('');
              setSelectedStatusEmoji(null);
            }}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 text-white py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-lg glow-blue hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] tap-target relative overflow-hidden group"
          >
            <span className="relative z-10">Update Status</span>
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-3 text-center font-medium">
          Everyone in your bubble will see your status and location instantly
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
                  maxSizeMB: 1,
                  maxWidthOrHeight: 512,
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
        
        {/* Notification Settings */}
        <NotificationSettings />
        
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

      {/* Profile View Modal */}
      {showProfile && selectedMember && (
        <ProfileView
          member={selectedMember}
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
            />
          )}
        </>
      )}

    </div>
  );
};

export default Bubble;