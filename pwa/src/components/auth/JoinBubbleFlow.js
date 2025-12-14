import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Circle, Plus, ChevronDown } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import LocationStep from '../ui/LocationStep';
import imageCompression from 'browser-image-compression';

const JoinBubbleFlow = ({ onComplete, onBack, initialInviteToken = '' }) => {
  const [step, setStep] = useState(1);
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [relationshipRole, setRelationshipRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState(null);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinalStep = () => {
    const joinData = {
      inviteToken,
      firstName,
      lastName,
      userPhoto,
      imageFile,
      relationshipRole,
      email,
      password,
      location,
    };
    onComplete(joinData);
  };

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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step
            title="Enter Invite Code"
            subtitle={initialInviteToken ? "We found an invite code! You can edit it if needed." : "Get the invite code from a family member to join their bubble."}
            onNext={nextStep}
            onBack={onBack}
            canGoNext={inviteToken.trim().length >= 3}
          >
            {initialInviteToken && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                <p className="text-blue-200 text-sm text-center">
                  ✓ Invite code loaded from link
                </p>
              </div>
            )}
            <input
              type="text"
              placeholder="BUBXXXXXXXX"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full text-center font-bold text-base sm:text-xl md:text-2xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors tracking-widest font-mono tap-target"
            />
            <p className="text-gray-400 text-sm mt-4 text-center">
              The code should start with "BUB"
            </p>
          </Step>
        );
      case 2:
        return (
          <Step
            title="What's Your Name?"
            subtitle="This is how you'll appear to others in the bubble."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={firstName.trim() !== '' && lastName.trim() !== ''}
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="w-full sm:w-1/2 text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors tap-target"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="w-full sm:w-1/2 text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors tap-target"
              />
            </div>
          </Step>
        );
      case 3:
        return (
          <Step
            title="Add Your Photo"
            subtitle="This will be visible to members in the bubble."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={true}
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="join-user-photo-upload"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const compressedFile = await imageCompression(file, {
                      maxSizeMB: 1,
                      maxWidthOrHeight: 512,
                      useWebWorker: true
                    });
                    setImageFile(compressedFile);
                    const previewUrl = URL.createObjectURL(compressedFile);
                    setUserPhoto(previewUrl);
                  } catch (error) {
                    console.error("Image compression error:", error);
                    setImageFile(file);
                    const previewUrl = URL.createObjectURL(file);
                    setUserPhoto(previewUrl);
                  }
                }
              }}
            />
            <label
              htmlFor="join-user-photo-upload"
              className="relative w-32 h-32 rounded-full cursor-pointer overflow-hidden flex items-center justify-center mx-auto bg-gray-800 border-2 border-gray-700 hover:border-blue-500 transition-colors group"
            >
              {userPhoto ? (
                <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
              ) : (
                <Plus size={48} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
              )}
              {userPhoto && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold">Change Photo</span>
                </div>
              )}
            </label>
          </Step>
        );
      case 4:
        return (
          <Step
            title="Set Your Location"
            subtitle="This helps family members see where you are on the globe."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={location !== null}
          >
            <LocationStep
              onLocationSet={(loc) => setLocation(loc)}
              initialLocation={location}
            />
          </Step>
        );
      case 5:
        return (
          <Step
            title="Your Role in the Bubble"
            subtitle="This helps personalize your connection to the family."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={relationshipRole.trim() !== ''}
          >
            <CustomSelect
              options={relationshipOptions}
              value={relationshipRole}
              onChange={setRelationshipRole}
              placeholder="Select your role"
              className="w-full"
            />
            {relationshipRole === 'Custom' && (
              <input
                type="text"
                placeholder="Enter custom role"
                value={relationshipRole}
                onChange={(e) => setRelationshipRole(e.target.value)}
                autoComplete="off"
                className="w-full text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors mt-4 tap-target"
              />
            )}
          </Step>
        );
      case 6:
        return (
          <Step
            title="Create Your Account"
            subtitle="This will secure your account and let you access your bubble anytime."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={/\S+@\S+\.\S+/.test(email) && password.length >= 6}
          >
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className="w-full text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors tap-target"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors tap-target"
            />
            <p className="text-gray-400 text-sm text-center">
              You'll be automatically logged in after joining
            </p>
          </Step>
        );
      case 7:
        return (
          <Step
            title="Ready to Join!"
            subtitle="Here's a preview of how you'll appear in the bubble."
            onNext={handleFinalStep}
            onBack={prevStep}
            canGoNext={true}
            nextButtonText="Join Bubble"
          >
            <div className="text-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto relative overflow-hidden shadow-2xl">
                {userPhoto ? (
                  <img src={userPhoto} alt="User" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Circle size={48} className="text-white" />
                )}
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-4 border-gray-950 flex items-center justify-center">
                  <ChevronRight size={16} className="text-white transform rotate-45" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">{firstName} {lastName}</h2>
              <p className="text-gray-300 capitalize">{relationshipRole || 'Family Member'}</p>
              <p className="text-sm text-gray-500 mt-6">
                You're about to join a family bubble. Tap "Join Bubble" to continue.
              </p>
            </div>
          </Step>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      <div className="w-full max-w-md h-full flex flex-col justify-center overflow-y-auto scrollbar-hide">
        {renderStep()}
      </div>
    </div>
  );
};

const Step = ({ title, subtitle, onNext, onBack, canGoNext, children, nextButtonText = 'Next' }) => (
  <div className="max-w-md w-full z-10">
    {onBack && (
      <button
        onClick={onBack}
        className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>
    )}
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-gray-400">{subtitle}</p>
      </div>
      <div className="space-y-6">
        {children}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {nextButtonText}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  </div>
);

export default JoinBubbleFlow;

