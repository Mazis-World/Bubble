import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

const relationshipOptions = [
  { value: '', label: 'Select your role', disabled: true },
  { value: 'Mom', label: 'Mom' },
  { value: 'Dad', label: 'Dad' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Grandma', label: 'Grandma' },
  { value: 'Grandpa', label: 'Grandpa' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Custom', label: 'Custom' },
];

const ProfileEditForm = ({ member, bubbleId, onSave }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [quote, setQuote] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      const memberRole = member.role || '';
      // Check if role is a custom role (not in the standard list)
      const isCustomRole = memberRole && !relationshipOptions.some(opt => opt.value === memberRole);
      if (isCustomRole) {
        setRole('Custom');
        setCustomRole(memberRole);
      } else {
        setRole(memberRole);
        setCustomRole('');
      }
      setQuote(member.quote || '');
      setPhone(member.phone || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]); // relationshipOptions is a constant defined outside component, no need to include

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    await onSave({
      name: name.trim(),
      role: (role === 'Custom' ? customRole : role).trim() || 'Family Member',
      quote: quote.trim() || null,
      phone: phone.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Role
        </label>
        <CustomSelect
          options={relationshipOptions}
          value={role}
          onChange={setRole}
          placeholder="Select your role"
          className="w-full"
        />
        {role === 'Custom' && (
          <input
            type="text"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Enter custom role"
            className="w-full mt-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Phone (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="For family SOS call button"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Quote (Optional)
        </label>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Add a personal quote or message..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition-all"
      >
        Save Changes
      </button>
    </form>
  );
};

export default ProfileEditForm;

