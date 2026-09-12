import React, { useEffect, useMemo, useState } from 'react';
import {
  PLACE_LIMIT_MESSAGE,
  MAX_PLACES_PER_USER,
} from '../../services/places/constants';
import { canCreatePlace } from '../../services/places/authz';
import {
  automaticDetectionAvailable,
  ensurePlaceLocationPermission,
  markPlacePermissionPrompted,
  readPlacePermissionPrompted,
  requestPlaceLocation,
} from '../../services/places/permissions';
import { getPlaceWatcher } from '../../services/places/watcher';
import {
  checkInAtPlace,
  createPlace,
  deletePlace,
  recordPlaceUpdated,
  updatePlace,
} from '../../services/places/api';
import usePlaces from '../../hooks/usePlaces';
import PlacesList from './PlacesList';
import AddPlaceFlow from './AddPlaceFlow';
import PlaceDetail from './PlaceDetail';
import PlacePermissionSheet from './PlacePermissionSheet';

const PlacesHub = ({
  bubbleId,
  members = [],
  currentMember,
  initialPlaceId = null,
  onClose,
}) => {
  const { places, presence } = usePlaces(bubbleId);
  const currentUserId = currentMember?.userId;
  const mine = useMemo(
    () => places.filter((place) => place.ownerId === currentUserId),
    [places, currentUserId]
  );
  const [view, setView] = useState(initialPlaceId ? 'detail' : 'list');
  const [selectedId, setSelectedId] = useState(initialPlaceId);
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [showPermission, setShowPermission] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const selected = places.find((place) => place.placeId === selectedId) || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const alreadyPrompted = readPlacePermissionPrompted();
      const result = await ensurePlaceLocationPermission();
      if (cancelled) return;
      setPermission(result.status);
      markPlacePermissionPrompted();
      if (result.status === 'granted') {
        setShowPermission(false);
        getPlaceWatcher().start();
        return;
      }
      if (alreadyPrompted && result.status === 'denied') return;
      setShowPermission(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goList = () => {
    setView('list');
    setSelectedId(null);
    setError(null);
  };

  const handleAdd = () => {
    if (mine.length >= MAX_PLACES_PER_USER) {
      setError(PLACE_LIMIT_MESSAGE);
      return;
    }
    if (!canCreatePlace({
      authUid: currentUserId,
      ownerId: currentUserId,
      memberIds: members.map((item) => item.userId).filter(Boolean),
      ownedCount: mine.length,
    })) {
      setError(PLACE_LIMIT_MESSAGE);
      return;
    }
    setError(null);
    setView('add');
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      if (view === 'edit' && selected) {
        const updated = await updatePlace(bubbleId, selected.placeId, payload);
        const locationChanged = payload.latitude !== selected.latitude
          || payload.longitude !== selected.longitude
          || payload.address !== selected.address;
        if (locationChanged && selected.type === 'home') {
          await recordPlaceUpdated({
            bubbleId,
            place: { ...selected, ...updated, placeId: selected.placeId },
            nodeId: currentMember?.id,
            displayName: currentMember?.name,
          });
        }
        setSelectedId(selected.placeId);
        setView('detail');
      } else {
        const placeId = await createPlace({ bubbleId, ...payload });
        setSelectedId(placeId);
        setView('detail');
      }
    } catch (err) {
      setError(err.message || PLACE_LIMIT_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (place) => {
    try {
      await deletePlace(bubbleId, place.placeId);
      goList();
    } catch (err) {
      setError(err.message || 'Could not delete that Place.');
    }
  };

  const handleCheckIn = async () => {
    if (!selected) return;
    setCheckingIn(true);
    try {
      await checkInAtPlace({
        bubbleId,
        place: selected,
        nodeId: currentMember?.id,
        displayName: currentMember?.name,
      });
    } catch (err) {
      setError(err.message || 'Could not check in.');
    } finally {
      setCheckingIn(false);
    }
  };

  const enableLocation = async () => {
    setEnabling(true);
    try {
      await requestPlaceLocation();
      setPermission('granted');
      markPlacePermissionPrompted();
      setShowPermission(false);
      await getPlaceWatcher().start();
    } catch (err) {
      setPermission(err.code === 'permission_denied' ? 'denied' : 'unavailable');
      markPlacePermissionPrompted();
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className="space-y-4">
      {view === 'detail' && (
        <button type="button" onClick={goList} className="text-gray-400 hover:text-white text-sm font-semibold tap-target">
          ← Places
        </button>
      )}

      {view === 'list' && (
        <PlacesList
          places={places}
          presence={presence}
          members={members}
          currentUserId={currentUserId}
          locationAvailable={automaticDetectionAvailable(permission)}
          onAdd={handleAdd}
          onSelect={(place) => {
            setSelectedId(place.placeId);
            setView('detail');
          }}
        />
      )}

      {view === 'add' && (
        <AddPlaceFlow
          members={members}
          currentUserId={currentUserId}
          existingPlaces={mine}
          saving={saving}
          error={error}
          onCancel={goList}
          onSave={handleSave}
        />
      )}

      {view === 'edit' && selected && (
        <AddPlaceFlow
          members={members}
          currentUserId={currentUserId}
          existingPlaces={mine}
          initialPlace={selected}
          saving={saving}
          error={error}
          onCancel={() => setView('detail')}
          onSave={handleSave}
        />
      )}

      {view === 'detail' && selected && (
        <PlaceDetail
          place={selected}
          bubbleId={bubbleId}
          members={members}
          presence={presence}
          currentUserId={currentUserId}
          locationAvailable={automaticDetectionAvailable(permission)}
          checkingIn={checkingIn}
          onCheckIn={handleCheckIn}
          onEdit={() => setView('edit')}
          onDelete={handleDelete}
          onUpdateHome={() => setView('edit')}
        />
      )}

      {view === 'detail' && !selected && (
        <p className="text-gray-400 text-sm">That Place is no longer available.</p>
      )}

      {error && view === 'list' && (
        <p className="text-amber-200 text-sm">{error}</p>
      )}

      {showPermission && (
        <PlacePermissionSheet
          reason={permission === 'denied' ? 'denied' : permission === 'unavailable' ? 'gps_unavailable' : 'prompt'}
          enabling={enabling}
          onEnable={permission === 'denied' ? undefined : enableLocation}
          onContinueManual={() => {
            markPlacePermissionPrompted();
            setShowPermission(false);
          }}
          onClose={() => {
            markPlacePermissionPrompted();
            setShowPermission(false);
            onClose?.();
          }}
        />
      )}
    </div>
  );
};

export default PlacesHub;
