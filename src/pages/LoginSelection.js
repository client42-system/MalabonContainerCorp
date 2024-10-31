import React from 'react';
import { Briefcase, Tag, Factory, Calculator, ClipboardList, User, Crown, UserPlus, Key } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export default function LoginSelection() {
  const navigate = useNavigate();

  const jobPositions = [
    { title: "General Manager", icon: Briefcase },
    { title: "Marketing", icon: Tag },
    { title: "Plant Manager", icon: Factory },
    { title: "Accountant", icon: Calculator },
    { title: "Plant Supervisor", icon: ClipboardList },
    { title: "Office Secretary", icon: User },
  ];

  const handleJobClick = (position) => {
    navigate(`/login/${position}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6">Select Your Job Position</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {jobPositions.map((job, index) => (
            <button
              key={index}
              onClick={() => handleJobClick(job.title)}
              className="flex flex-col items-center justify-center h-24 w-full bg-white border border-black rounded-md text-center transition-colors duration-300 hover:bg-green-800 hover:text-white group"
            >
              <job.icon className="w-8 h-8 mb-2 text-gray-600 group-hover:text-white" />
              <span className="text-sm text-gray-800 group-hover:text-white">{job.title}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={() => handleJobClick("CEO")}
            className="flex flex-col items-center justify-center h-24 w-40 bg-white border border-black rounded-md text-center transition-colors duration-300 hover:bg-green-800 hover:text-white group"
          >
            <Crown className="w-8 h-8 mb-2 text-gray-600 group-hover:text-white" />
            <span className="text-sm text-gray-800 group-hover:text-white">CEO</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center">Protected by company security policy</p>
      </div>
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button
          onClick={() => navigate('/signup')}
          className="text-sm bg-gray-200 hover:bg-green-800 hover:text-white text-gray-800 py-2 px-4 rounded flex items-center border border-black"
        >
          <UserPlus className="w-4 h-4 mr-1" />
          <span>Sign Up New User</span>
        </button>
        <button
          onClick={() => navigate('/forgot-password')}
          className="text-sm bg-gray-200 hover:bg-green-800 hover:text-white text-gray-800 py-2 px-4 rounded flex items-center border border-black"
        >
          <Key className="w-4 h-4 mr-1" />
          <span>Forgot Password</span>
        </button>
      </div>
    </div>
  );
}