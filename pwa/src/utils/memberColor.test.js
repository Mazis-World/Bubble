import { colorForMember, memberColorMap, possessiveName } from './memberColor';

describe('memberColor', () => {
  const sister = { id: 'n-sis', userId: 'sister', name: 'Sister' };
  const dad = { id: 'n-dad', userId: 'dad', name: 'Dad' };
  const grandma = { id: 'n-gm', userId: 'grandma', name: 'Grandma' };
  const family = [sister, dad, grandma];

  test('gives each family member a distinct color', () => {
    const colors = family.map((member) => colorForMember(member, family));
    expect(new Set(colors).size).toBe(3);
  });

  test('keeps the same color for userId and node id', () => {
    const map = memberColorMap(family);
    expect(map.sister).toBe(map['n-sis']);
    expect(colorForMember('sister', family)).toBe(colorForMember(sister, family));
  });

  test('possessive names', () => {
    expect(possessiveName('Sister')).toBe("Sister's");
    expect(possessiveName('James')).toBe("James'");
  });
});
