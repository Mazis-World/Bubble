import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  DEFAULT_RADIUS_METERS,
  PLACE_PRESETS,
} from '../../services/places/constants';
import { overlappingWarning, shouldWarnOverlapping } from '../../services/places/geofence';
import PlaceMapPicker from './PlaceMapPicker';

const StepShell = ({
  title,
  subtitle,
  children,
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Continue',
  canGoNext,
  busy,
}) => (
  <div className="space-y-5">
    <div>
      {onBack && (
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-white tap-target mb-2 flex items-center gap-1">
          <ArrowLeft size={16} />
          {backLabel}
        </button>
      )}
      <h4 className="text-xl font-black text-white">{title}</h4>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
    {children}
    <button
      type="button"
      onClick={onNext}
      disabled={!canGoNext || busy}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-2xl font-bold tap-target disabled:opacity-40"
    >
      {busy ? 'Saving…' : nextLabel}
    </button>
  </div>
);

const AddPlaceFlow = ({
  members = [],
  currentUserId,
  existingPlaces = [],
  initialPlace = null,
  saving = false,
  error = null,
  overlapWarning = null,
  onCancel,
  onSave,
}) => {
  const editing = Boolean(initialPlace);
  const [step, setStep] = useState(1);
  const [preset, setPreset] = useState(
    PLACE_PRESETS.find((item) => item.type === initialPlace?.type) || PLACE_PRESETS[0]
  );
  const [customName, setCustomName] = useState(
    initialPlace && initialPlace.type === 'custom' ? initialPlace.name : ''
  );
  const [location, setLocation] = useState(
    initialPlace
      ? {
        latitude: initialPlace.latitude,
        longitude: initialPlace.longitude,
        address: initialPlace.address,
      }
      : null
  );
  const [radiusMeters, setRadiusMeters] = useState(initialPlace?.radiusMeters || DEFAULT_RADIUS_METERS);
  const [recipientUserIds, setRecipientUserIds] = useState(
    initialPlace?.recipientUserIds || members.map((member) => member.userId).filter((id) => id && id !== currentUserId)
  );
  const [arrivalOn, setArrivalOn] = useState(initialPlace?.arrivalNotificationsEnabled !== false);
  const [departureOn, setDepartureOn] = useState(initialPlace?.departureNotificationsEnabled !== false);

  const name = preset.type === 'custom' ? customName.trim() : preset.name;
  const nearby = useMemo(() => {
    if (!location) return false;
    return shouldWarnOverlapping(
      { ...location, radiusMeters, placeId: initialPlace?.placeId },
      existingPlaces
    );
  }, [location, radiusMeters, existingPlaces, initialPlace?.placeId]);

  const toggleRecipient = (userId) => {
    setRecipientUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  };

  const save = () => {
    onSave({
      name,
      type: preset.type,
      icon: preset.icon,
      color: preset.color,
      address: location?.address || '',
      latitude: location?.latitude,
      longitude: location?.longitude,
      radiusMeters,
      recipientUserIds,
      arrivalNotificationsEnabled: arrivalOn,
      departureNotificationsEnabled: departureOn,
    });
  };

  if (step === 1) {
    return (
      <StepShell
        title={editing ? 'Edit Place' : 'Name this Place'}
        subtitle="Pick something your family will recognize."
        onBack={onCancel}
        backLabel="Places"
        onNext={() => setStep(2)}
        canGoNext={Boolean(name)}
      >
        <div className="grid grid-cols-2 gap-2">
          {PLACE_PRESETS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setPreset(item)}
              className={`p-4 rounded-2xl border tap-target ${
                preset.type === item.type
                  ? 'border-purple-400 bg-purple-500/20'
                  : 'border-white/10 glass-light'
              }`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="text-white font-bold mt-1">{item.name}</div>
            </button>
          ))}
        </div>
        {preset.type === 'custom' && (
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="e.g. Soccer, Daycare"
            className="w-full px-4 py-3 glass-light border border-white/10 rounded-2xl text-white placeholder-gray-400 tap-target"
          />
        )}
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        title="Where is it?"
        subtitle="Search or use your current location."
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        canGoNext={location?.latitude != null}
      >
        <PlaceMapPicker location={location} onLocationSet={setLocation} />
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell
        title="How close counts as arriving?"
        subtitle="This radar is your arrival bubble. Drag to change how far it reaches."
        onBack={() => setStep(2)}
        onNext={() => setStep(4)}
        canGoNext={location?.latitude != null}
      >
        <PlaceMapPicker
          location={location}
          onLocationSet={setLocation}
          radiusMeters={radiusMeters}
          onRadiusChange={setRadiusMeters}
        />
        {(nearby || overlapWarning) && (
          <p className="text-amber-200 text-sm">{overlapWarning || overlappingWarning()}</p>
        )}
      </StepShell>
    );
  }

  if (step === 4) {
    return (
      <StepShell
        title="Who should we tell?"
        subtitle="Only the people you choose will get Place updates."
        onBack={() => setStep(3)}
        onNext={() => setStep(5)}
        canGoNext
      >
        <div className="space-y-2">
          {members.filter((member) => member.userId && member.userId !== currentUserId).map((member) => {
            const checked = recipientUserIds.includes(member.userId);
            return (
              <button
                key={member.userId || member.id}
                type="button"
                onClick={() => toggleRecipient(member.userId)}
                className="w-full flex items-center justify-between p-3 rounded-2xl glass-light border border-white/10 tap-target"
              >
                <span className="text-white font-semibold">{member.name}</span>
                <span className={`w-6 h-6 rounded-md border flex items-center justify-center ${checked ? 'bg-blue-600 border-blue-400 text-white' : 'border-gray-500 text-transparent'}`}>
                  ✓
                </span>
              </button>
            );
          })}
          {members.filter((member) => member.userId && member.userId !== currentUserId).length === 0 && (
            <p className="text-gray-400 text-sm">Invite family to your bubble to send Place updates.</p>
          )}
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      title="When should we notify?"
      subtitle="You can change this later."
      onBack={() => setStep(4)}
      onNext={save}
      nextLabel={editing ? 'Save Place' : 'Save Place'}
      canGoNext={Boolean(name && location)}
      busy={saving}
    >
      <label className="flex items-center justify-between p-3 rounded-2xl glass-light border border-white/10">
        <span className="text-white font-semibold">Notify when I arrive</span>
        <input type="checkbox" checked={arrivalOn} onChange={(event) => setArrivalOn(event.target.checked)} />
      </label>
      <label className="flex items-center justify-between p-3 rounded-2xl glass-light border border-white/10">
        <span className="text-white font-semibold">Notify when I leave</span>
        <input type="checkbox" checked={departureOn} onChange={(event) => setDepartureOn(event.target.checked)} />
      </label>
      {error && <p className="text-amber-200 text-sm">{error}</p>}
    </StepShell>
  );
};

export default AddPlaceFlow;
