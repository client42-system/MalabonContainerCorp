import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-md border-2 border-black p-8 mb-8 text-center">
        <span className="text-4xl font-bold">LOGO</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
        Malabon Container Corporation
      </h1>
      <p className="text-xl text-center mb-8 max-w-2xl">
        Streamlining Purchase Orders, Manufacturing, and Delivery
      </p>
      <button
        onClick={handleGetStarted}
        className="bg-black text-white text-lg py-2 px-6 rounded-md hover:bg-green-800 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}
