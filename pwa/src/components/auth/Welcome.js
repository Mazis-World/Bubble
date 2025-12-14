import React from 'react';
import { Circle, PlusCircle, LogIn, ChevronRight } from 'lucide-react';

const Welcome = ({ onLogin, onCreate, onJoin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Bubbles */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full animate-blob"></div>
        <div className="absolute bottom-0 -right-10 w-80 h-80 bg-blue-600/10 rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-teal-600/10 rounded-full animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full text-center z-10">
        <div className="inline-block p-4 bg-white/10 backdrop-blur-lg rounded-full mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30 animate-pulse">
            <Circle size={40} className="text-white" />
          </div>
        </div>

        <h1 className="text-5xl font-bold mb-3">Welcome to FamilyBubble</h1>
        <p className="text-lg text-gray-400 max-w-sm mx-auto">
          One bubble. One shared space. Instantly connect with your family circle.
        </p>

        <div className="mt-12 space-y-5">
          {/* Create New Bubble Card */}
          <div
            onClick={onCreate}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 hover:border-purple-500 transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex items-center">
              <div className="bg-purple-600/30 p-3 rounded-full mr-5">
                <PlusCircle size={28} className="text-purple-300" />
              </div>
              <div>
                <h2 className="font-semibold text-xl mb-1">Create a New Bubble</h2>
                <p className="text-gray-400 text-sm">Start a new circle for your family or friends.</p>
              </div>
              <ChevronRight size={24} className="ml-auto text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Join Existing Bubble Card */}
          <div
            onClick={onJoin}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className="flex items-center">
              <div className="bg-blue-600/30 p-3 rounded-full mr-5">
                <LogIn size={28} className="text-blue-300" />
              </div>
              <div>
                <h2 className="font-semibold text-xl mb-1">Join an Existing Bubble</h2>
                <p className="text-gray-400 text-sm">Use an invite code to join a circle.</p>
              </div>
              <ChevronRight size={24} className="ml-auto text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-12 text-gray-500">
          <p>
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