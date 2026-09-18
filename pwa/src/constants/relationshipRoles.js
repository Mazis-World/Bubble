export const RELATIONSHIP_ROLE_OPTIONS = [
  { value: '', label: 'Select your role', disabled: true },
  { value: 'Mom', label: 'Mom' },
  { value: 'Dad', label: 'Dad' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Grandmother', label: 'Grandmother' },
  { value: 'Grandfather', label: 'Grandfather' },
  { value: 'Grandma', label: 'Grandma' },
  { value: 'Grandpa', label: 'Grandpa' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Custom', label: 'Custom' },
];

export const isStandardRelationshipRole = (role) =>
  Boolean(role) && RELATIONSHIP_ROLE_OPTIONS.some((opt) => !opt.disabled && opt.value === role);
