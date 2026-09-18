import { RELATIONSHIP_ROLE_OPTIONS, isStandardRelationshipRole } from './relationshipRoles';

const values = () => RELATIONSHIP_ROLE_OPTIONS.map((option) => option.value);

test('create, join, and profile can pick Grandmother and Grandfather', () => {
  expect(values()).toEqual(expect.arrayContaining(['Grandmother', 'Grandfather', 'Grandma', 'Grandpa']));
});

test('existing Grandma and Grandpa roles stay standard instead of custom', () => {
  expect(isStandardRelationshipRole('Grandma')).toBe(true);
  expect(isStandardRelationshipRole('Grandpa')).toBe(true);
  expect(isStandardRelationshipRole('Grandmother')).toBe(true);
  expect(isStandardRelationshipRole('Grandfather')).toBe(true);
});

test('unknown roles are not treated as standard', () => {
  expect(isStandardRelationshipRole('')).toBe(false);
  expect(isStandardRelationshipRole('Nana')).toBe(false);
});
