import React, { useState } from 'react';
import { CheckCircle2, Users, MapPin, MessageCircle, Sparkles, ChevronRight, X } from 'lucide-react';

const WelcomeWalkthrough = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: CheckCircle2,
      title: "Welcome to FamilyBubble Premium!",
      description: "You're all set! Let's take a quick tour of your new family space.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Users,
      title: "Your Family Circle",
      description: "See everyone in your bubble at a glance. Each person appears as a bubble on your radar.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: MapPin,
      title: "Real-Time Location",
      description: "Share your location with family members. See where everyone is on the interactive globe.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: MessageCircle,
      title: "Status Updates",
      description: "Share how you're feeling with emojis and status updates. Keep your family in the loop!",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Sparkles,
      title: "Invite Family Members",
      description: "Invite family members to join your bubble. Share your invite code or send a link!",
      color: "from-violet-500 to-purple-500",
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div 
      className="h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative" 
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Background Bubbles */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full animate-blob"></div>
        <div className="absolute bottom-0 -right-10 w-80 h-80 bg-blue-600/10 rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-teal-600/10 rounded-full animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full z-10 relative">
        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-0 right-0 text-gray-400 hover:text-white transition-colors p-2"
          aria-label="Skip walkthrough"
        >
          <X size={24} />
        </button>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-white'
                  : index < currentStep
                  ? 'w-2 bg-white/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg text-center">
          {/* Icon */}
          <div className={`inline-flex p-4 bg-gradient-to-br ${currentStepData.color} rounded-3xl mb-6 shadow-lg`}>
            <Icon size={48} className="text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4">{currentStepData.title}</h1>

          {/* Description */}
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Action button */}
          <button
            onClick={nextStep}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all transform hover:scale-105"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeWalkthrough;
