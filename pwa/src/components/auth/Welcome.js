import React from 'react';
import { PlusCircle, LogIn, ChevronRight, Sparkles } from 'lucide-react';

const Welcome = ({ onLogin, onCreate, onJoin }) => {
  return (
    <div 
      className="h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center overflow-hidden relative" 
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        maxHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overflow: 'hidden'
      }}
    >
      {/* Background decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full animate-blob"></div>
        <div className="absolute bottom-0 -right-10 w-80 h-80 bg-blue-600/10 rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-teal-600/10 rounded-full animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full text-center z-10 relative px-4 py-8 sm:py-10 md:py-12">
        {/* Logo */}
        <div className="inline-flex items-center justify-center mb-8 sm:mb-10 md:mb-12 animate-scale-in" style={{ opacity: 0, animationDelay: '0.1s' }}>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden">
            {/* Diagonal gradient background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-pink-500"></div>
            {/* White center ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-4 border-white"></div>
            </div>
          </div>
        </div>

        {/* Heading with gradient */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-tight px-2 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
          Welcome to FamilyBubble
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-300 text-base sm:text-lg md:text-xl px-4 max-w-md mx-auto mb-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.4s' }}>
          One bubble. One shared space. Instantly connect with your family circle.
        </p>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 rounded-full px-4 py-2 mb-8 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.5s' }}>
          <Sparkles size={18} className="text-emerald-300 animate-pulse" />
          <span className="text-emerald-200 font-semibold text-sm sm:text-base">Your Family Galaxy Awaits</span>
        </div>

        {/* Action Cards */}
        <div className="mt-8 space-y-4 sm:space-y-5">
          {/* Create New Bubble Card */}
          <div
            onClick={onCreate}
            className="group bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 backdrop-blur-sm hover:bg-white/10 hover:border-purple-500/50 active:bg-white/10 active:scale-[0.98] transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-xl tap-target animate-fade-in-up"
            style={{ 
              opacity: 0, 
              animationDelay: '0.6s',
              animation: 'fadeInUp 0.6s ease-out 0.6s forwards'
            }}
          >
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <PlusCircle size={24} className="sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-1">Create a New Bubble</h2>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">Start a new circle for your family or friends.</p>
              </div>
              <ChevronRight size={24} className="flex-shrink-0 text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Join Existing Bubble Card */}
          <div
            onClick={onJoin}
            className="group bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 backdrop-blur-sm hover:bg-white/10 hover:border-blue-500/50 active:bg-white/10 active:scale-[0.98] transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-xl tap-target animate-fade-in-up"
            style={{ 
              opacity: 0, 
              animationDelay: '0.7s',
              animation: 'fadeInUp 0.6s ease-out 0.7s forwards'
            }}
          >
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <LogIn size={24} className="sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-1">Join an Existing Bubble</h2>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">Use an invite code to join a circle.</p>
              </div>
              <ChevronRight size={24} className="flex-shrink-0 text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="mt-10 sm:mt-12 text-gray-400 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.8s' }}>
          <p className="text-sm sm:text-base">
            Already have an account?{' '}
            <span
              onClick={onLogin}
              className="font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            >
              Sign In
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;