export const MEMBER_COLOR_PALETTE = [
  '#60a5fa',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fbbf24',
  '#22d3ee',
  '#fb7185',
  '#fb923c',
];

export const memberKey = (memberOrId) => {
  if (memberOrId == null) return '';
  if (typeof memberOrId === 'string' || typeof memberOrId === 'number') {
    return String(memberOrId);
  }
  return String(memberOrId.userId || memberOrId.id || memberOrId.nodeId || '');
};

export const findMember = (members = [], ownerId) => {
  const key = String(ownerId || '');
  if (!key) return null;
  return (members || []).find((member) => (
    member?.userId === key
    || member?.id === key
    || member?.nodeId === key
  )) || null;
};

const hashColor = (id) => {
  const text = String(id || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return MEMBER_COLOR_PALETTE[hash % MEMBER_COLOR_PALETTE.length];
};

export const memberColorMap = (members = []) => {
  const unique = [];
  const seen = new Set();
  (members || []).forEach((member) => {
    const key = memberKey(member);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(member);
  });
  unique.sort((a, b) => memberKey(a).localeCompare(memberKey(b)));
  const map = {};
  unique.forEach((member, index) => {
    const color = MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length];
    [member.userId, member.id, member.nodeId].filter(Boolean).forEach((id) => {
      map[String(id)] = color;
    });
  });
  return map;
};

export const colorForMember = (memberOrId, members = []) => {
  const map = memberColorMap(members);
  const key = memberKey(memberOrId);
  if (key && map[key]) return map[key];
  return hashColor(key || 'family');
};

export const hexToNumber = (hex) => {
  const value = String(hex || '').replace('#', '');
  const parsed = Number.parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed : 0x3b82f6;
};

export const possessiveName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return "Family's";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
};
