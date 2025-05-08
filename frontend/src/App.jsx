import React from 'react';
import './index.css';

import AvailabilityDisplay from './components/AvailabilityDisplay/AvailabilityDisplay';
import CreateAvailability from './components/CreateAvailability/CreateAvailability';
//import JoinSession from './components/JoinSession/JoinSession';

function App() {
  return (
    <div className="
      bg-gray-800 text-white min-h-screen p-3 flex flex-col items-center
      bg-[url('/images/information-bg.3baeb722.jpg')] 
    "> {/* Removed justify-center for better layout */}
      <h1 className="text-4xl font-bold mb-8 text-center text-orange-400 font-s1">
        🦑 Salmon Run Scheduler 🥚
      </h1>

      {/* added space-y-8 for spacing */}
      <div className="max-w-2xl mx-auto w-full space-y-8"> 
        {/* Use the components here as JSX tags */}
        <CreateAvailability />

        <AvailabilityDisplay />

      </div>

    </div>
  );
}

export default App;