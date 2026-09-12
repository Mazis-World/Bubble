import { useEffect, useMemo, useState } from 'react';
import { listenToPlaceActivity, listenToPlaces, listenToPresence } from '../services/places/api';

export default function usePlaces(bubbleId) {
  const [places, setPlaces] = useState([]);
  const [presence, setPresence] = useState([]);

  useEffect(() => {
    if (!bubbleId) {
      setPlaces([]);
      setPresence([]);
      return undefined;
    }
    const stopPlaces = listenToPlaces(bubbleId, setPlaces);
    const stopPresence = listenToPresence(bubbleId, setPresence);
    return () => {
      stopPlaces();
      stopPresence();
    };
  }, [bubbleId]);

  return useMemo(() => ({ places, presence }), [places, presence]);
}

export function usePlaceActivity(bubbleId, placeId) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!bubbleId || !placeId) {
      setEvents([]);
      return undefined;
    }
    return listenToPlaceActivity(bubbleId, placeId, setEvents);
  }, [bubbleId, placeId]);

  return events;
}
