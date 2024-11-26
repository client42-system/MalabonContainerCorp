import React from 'react';
import { Briefcase, Tag, Factory, Calculator, ClipboardList, User, Crown, UserPlus, Key } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const POSITIONS = {
  GENERAL_MANAGER: "General Manager",
  MARKETING: "Marketing",
  PLANT_MANAGER: "Plant Manager",
  ACCOUNTANT: "Accountant",
  PLANT_SUPERVISOR: "Plant Supervisor",
  OFFICE_SECRETARY: "Office Secretary",
  CEO: "CEO"
};

export default function LoginSelection() {
  const navigate = useNavigate();

  const jobPositions = [
    { title: POSITIONS.GENERAL_MANAGER, icon: Briefcase },
    { title: POSITIONS.MARKETING, icon: Tag },
    { title: POSITIONS.PLANT_MANAGER, icon: Factory },
    { title: POSITIONS.ACCOUNTANT, icon: Calculator },
    { title: POSITIONS.PLANT_SUPERVISOR, icon: ClipboardList },
    { title: POSITIONS.OFFICE_SECRETARY, icon: User },
  ];

  const handleJobClick = (position) => {
    navigate(`/login/${position}`);
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{ 
        backgroundColor: '#fff',
      }}
    >
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Select Your Job Position</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {jobPositions.map((job, index) => (
            <button
              key={index}
              onClick={() => handleJobClick(job.title)}
              className="flex flex-col items-center justify-center h-24 w-full bg-white border border-black rounded-md text-center transition-all duration-300 hover:bg-gray-50 hover:shadow-md group"
            >
              <job.icon className="w-8 h-8 mb-2 text-gray-600 group-hover:text-gray-700" />
              <span className="text-sm text-gray-700 group-hover:text-gray-800">{job.title}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-center mb-4">
          <button
            onClick={() => handleJobClick(POSITIONS.CEO)}
            className="flex flex-col items-center justify-center h-24 w-40 bg-white border border-black rounded-md text-center transition-all duration-300 hover:bg-gray-50 hover:shadow-md group"
          >
            <Crown className="w-8 h-8 mb-2 text-gray-600 group-hover:text-gray-700" />
            <span className="text-sm text-gray-700 group-hover:text-gray-800">CEO</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center">Protected by company security policy</p>
      </div>
    </div>
  );
}