import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-100 p-4">
      <img 
        src="/Trademarkbg.png" 
        alt="Malabon Container Corporation Trademark" 
        className="w-[400px] h-auto mb-8"
      />
      
      <div className="max-w-3xl text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4 tracking-tight">
          Malabon Container Corporation
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
          Streamlining Purchase Orders, Manufacturing, and Delivery
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-black text-white text-base md:text-lg py-2.5 px-6 rounded-lg 
                   hover:bg-green-800 transition-all duration-300 
                   transform hover:scale-105 shadow-md
                   focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
