import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Circle, Plus } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import LocationStep from '../ui/LocationStep';
import imageCompression from 'browser-image-compression';

const CreateBubbleFlow = ({ onComplete, onBack }) => {
  const [step, setStep] = useState(1);
  const [bubbleName, setBubbleName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userPhoto, setUserPhoto] = useState(null); // This will hold the preview URL
  const [imageFile, setImageFile] = useState(null); // This will hold the file object
  const [relationshipRole, setRelationshipRole] = useState('');
  const [location, setLocation] = useState(null);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinalStep = () => {
    const bubbleData = {
      bubbleName,
      firstName,
      lastName,
      email,
      password,
      userPhoto,
      imageFile,
      relationshipRole,
      location,
    };
    onComplete(bubbleData);
  };


  const relationshipOptions = [
    { value: '', label: 'Select your role', disabled: true }, // Placeholder option
    { value: 'Mom', label: 'Mom' },
    { value: 'Dad', label: 'Dad' },
    { value: 'Brother', label: 'Brother' },
    { value: 'Sister', label: 'Sister' },
    { value: 'Guardian', label: 'Guardian' },
    { value: 'Custom', label: 'Custom' },
  ];



  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step
            title="Name Your Bubble"
            subtitle="This will be the name of your shared family space."
            onNext={nextStep}
            onBack={onBack}
            canGoNext={bubbleName.trim() !== ''}
          >
            <input
              type="text"
              placeholder="e.g., The Miller Family"
              value={bubbleName}
              onChange={(e) => setBubbleName(e.target.value)}
              autoComplete="off"
              className="w-full text-center font-bold text-base sm:text-xl md:text-2xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors tap-target"
            />
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
                className="w-full sm:w-1/2 text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors tap-target"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="w-full sm:w-1/2 text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors tap-target"
              />
            </div>
          </Step>
        );
      case 3:
        return (
          <Step
            title="Your Email"
            subtitle="This will be used to secure your account."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={/\S+@\S+\.\S+/.test(email)}
          >
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-center font-bold text-2xl px-4 py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </Step>
        );
      case 4:
        return (
          <Step
            title="Create a Password"
            subtitle="Must be at least 6 characters long."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={password.length >= 6}
          >
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-center font-bold text-2xl px-4 py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </Step>
        );
      case 5:
        return (
          <Step
            title="Add Your Photo"
            subtitle="This will be visible to members in your bubble."
            onNext={nextStep}
            onBack={prevStep}
            canGoNext={true} // Allow skipping photo
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="user-photo-upload"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    // Compress image before storing
                    const compressedFile = await imageCompression(file, {
                      maxSizeMB: 1,
                      maxWidthOrHeight: 512,
                      useWebWorker: true
                    });
                    setImageFile(compressedFile);
                    // Create a preview URL from compressed file
                    const previewUrl = URL.createObjectURL(compressedFile);
                    setUserPhoto(previewUrl);
                  } catch (error) {
                    console.error("Image compression error:", error);
                    // Fallback to original file if compression fails
                    setImageFile(file);
                    const previewUrl = URL.createObjectURL(file);
                    setUserPhoto(previewUrl);
                  }
                }
              }}
            />
            <label
              htmlFor="user-photo-upload"
              className="relative w-32 h-32 rounded-full cursor-pointer overflow-hidden flex items-center justify-center mx-auto bg-gray-800 border-2 border-gray-700 hover:border-purple-500 transition-colors group"
            >
              {userPhoto ? (
                <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
              ) : (
                <Plus size={48} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
              )}
              {userPhoto && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold">Change Photo</span>
                </div>
              )}
            </label>
          </Step>
        );
      case 6:
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
      case 7:
        return (
          <Step
            title="Your Role in the Bubble"
            subtitle="This helps personalize the bubble later."
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
                autoComplete="off"
                className="w-full text-center font-bold text-base sm:text-xl px-4 py-4 sm:py-5 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors mt-4 tap-target"
                onChange={(e) => setRelationshipRole(e.target.value)}
              />
            )}
          </Step>
        );
      case 8:
        return (
          <Step
            title="Ready to Create Your Bubble!"
            subtitle="Here's a summary of your new bubble."
            onNext={handleFinalStep}
            onBack={prevStep}
            canGoNext={true}
            nextButtonText="Create Bubble"
          >
            <div className="text-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto relative overflow-hidden">
                {userPhoto ? (
                  <img src={userPhoto} alt="User" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Circle size={48} className="text-white" />
                )}
                {/* Mock status icon */}
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-gray-950 flex items-center justify-center">
                  <ChevronRight size={16} className="text-white transform rotate-45" />
                </div>
              </div>
              <h2 className="text-3xl font-bold">{bubbleName}</h2>
              <p className="text-gray-300">Welcome, {firstName} {lastName} ({relationshipRole})!</p>
              <p className="text-sm text-gray-500">
                Creating a bubble is free. You can upgrade later for SOS and extra family members.
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
    {onBack && <button
      onClick={onBack}
      className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
    >
      <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
      Back
    </button>}
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
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {nextButtonText}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  </div>
);

export default CreateBubbleFlow;
