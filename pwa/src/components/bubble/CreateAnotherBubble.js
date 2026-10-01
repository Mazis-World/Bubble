import React, { useState } from 'react';
import CustomSelect from '../ui/CustomSelect';

export const BUBBLE_ROLE_OPTIONS = [
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

const CreateAnotherBubble = ({
  needProfileNames = false,
  submitting = false,
  onSubmit,
  onCancel,
}) => {
  const [bubbleName, setBubbleName] = useState('');
  const [relationshipRole, setRelationshipRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const role = relationshipRole === 'Custom' ? customRole.trim() : relationshipRole.trim();
  const canSubmit = bubbleName.trim()
    && role
    && !submitting
    && (!needProfileNames || (firstName.trim() && lastName.trim()));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      bubbleName: bubbleName.trim(),
      relationshipRole: role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-another-bubble">
      <p className="text-gray-400 text-sm">
        Start another family space — like your mom’s side. You can be in two bubbles.
      </p>
      <input
        type="text"
        placeholder="e.g., Mom's Family"
        value={bubbleName}
        onChange={(event) => setBubbleName(event.target.value)}
        autoComplete="off"
        aria-label="Bubble name"
        className="w-full text-center font-bold text-base px-4 py-4 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
      {needProfileNames && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            aria-label="First name"
            className="w-full text-center font-bold text-base px-4 py-4 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            aria-label="Last name"
            className="w-full text-center font-bold text-base px-4 py-4 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      )}
      <CustomSelect
        options={BUBBLE_ROLE_OPTIONS}
        value={relationshipRole}
        onChange={setRelationshipRole}
        placeholder="Select your role"
        className="w-full"
      />
      {relationshipRole === 'Custom' && (
        <input
          type="text"
          placeholder="Enter custom role"
          value={customRole}
          onChange={(event) => setCustomRole(event.target.value)}
          aria-label="Custom role"
          className="w-full text-center font-bold text-base px-4 py-4 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating…' : 'Create bubble'}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20"
        >
          Cancel
        </button>
      )}
    </form>
  );
};

export default CreateAnotherBubble;
