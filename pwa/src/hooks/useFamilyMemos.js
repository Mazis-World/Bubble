import { useEffect, useMemo, useState } from 'react';
import { listenToFamilyMemos, sortFamilyMemos } from '../services/memos';

export default function useFamilyMemos(bubbleId, openSosIds = []) {
  const [memos, setMemos] = useState([]);

  useEffect(() => {
    if (!bubbleId) {
      setMemos([]);
      return undefined;
    }
    return listenToFamilyMemos(bubbleId, setMemos);
  }, [bubbleId]);

  return useMemo(() => sortFamilyMemos(memos, openSosIds), [memos, openSosIds]);
}
