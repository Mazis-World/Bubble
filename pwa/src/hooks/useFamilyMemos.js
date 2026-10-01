import { useEffect, useMemo, useState } from 'react';
import {
  listenToFamilyMemos,
  memosFromMemberStatuses,
  mergeAutoloadedMemos,
  sortFamilyMemos,
} from '../services/memos';

export default function useFamilyMemos(bubbleId, openSosIds = [], members = []) {
  const [memos, setMemos] = useState([]);

  useEffect(() => {
    if (!bubbleId) {
      setMemos([]);
      return undefined;
    }
    return listenToFamilyMemos(bubbleId, setMemos);
  }, [bubbleId]);

  const memberMemos = useMemo(
    () => memosFromMemberStatuses(members, bubbleId),
    [members, bubbleId]
  );

  return useMemo(
    () => sortFamilyMemos(mergeAutoloadedMemos(memos, memberMemos), openSosIds),
    [memos, memberMemos, openSosIds]
  );
}
