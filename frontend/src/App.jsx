import React from 'react';
import './index.css';

// Import the components you created
import CreateAvailability from './components/CreateAvailability/CreateAvailability';
//import JoinSession from './components/JoinSession/JoinSession';

function App() {
  return (
    <div className="bg-gray-800 text-white min-h-screen p-8 flex flex-col items-center"> {/* Removed justify-center for better layout */}
      <h1 className="text-4xl font-bold mb-8 text-center text-orange-400">
        🦑 Salmon Run Scheduler 🥚
      </h1>

      {/* Add a container to center and limit width, like before */}
      <div className="max-w-2xl mx-auto w-full"> {/* Added w-full to ensure it takes available width up to max */}
        {/* Use the components here as JSX tags */}
        <CreateAvailability />

      </div>

    </div>
  );
}

export default App;