import React from 'react';

export default function Home() {
  const handleExplore = () => {
    console.log('Exploring...');
    // Add your navigation or functionality here
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-md border-2 border-black p-8 mb-8 text-center">
        <span className="text-4xl font-bold">LOGO</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
        Welcome to Malabon Container Corporation
      </h1>
      <p className="text-xl text-center mb-8 max-w-2xl">
        Manage orders, monitor deliveries, and streamline production processes with ease.
      </p>
      <button
        onClick={handleExplore}
        className="bg-blue-600 text-white text-lg py-2 px-6 rounded-md hover:bg-blue-800 transition-colors"
      >
        Explore Now
      </button>
    </div>
  );
}
