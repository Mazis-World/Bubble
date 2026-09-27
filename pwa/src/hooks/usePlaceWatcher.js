import { useEffect } from 'react';
import { getPlaceWatcher } from '../services/places/watcher';
import { listenToPlaces } from '../services/places/api';

export default function usePlaceWatcher({
  bubbleId,
  userId,
  nodeId,
  displayName,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled || !bubbleId || !userId) return undefined;
    const watcher = getPlaceWatcher();
    let active = true;
    const stopListen = listenToPlaces(bubbleId, (places) => {
      if (!active) return;
      watcher.configure({
        bubbleId,
        userId,
        nodeId,
        displayName,
        places,
      });
    });
    watcher.start();
    return () => {
      active = false;
      stopListen();
      watcher.stop();
    };
  }, [bubbleId, userId, nodeId, displayName, enabled]);
}
