import React, { useState } from 'react'; // Import useState hook

function CreateAvailability() {
  // State variables to hold form input values
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null); // To store the generated code from backend
  const [loading, setLoading] = useState(false); // To indicate if API request is in progress
  const [error, setError] = useState(null); // To display API errors

  // Function to handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default browser form submission

    setLoading(true); // Set loading state to true
    setError(null); // Clear previous errors
    setGeneratedCode(null); // Clear previous code

    // Prepare data to send to the backend
    const availabilityData = {
      startTime: startTime, // Send the state value
      endTime: endTime,     // Send the state value
      description: description, // Send the state value
    };

    try {
      // Send POST request to backend API
      const response = await fetch('/api/availability', {
        method: 'POST', // Specify the method
        headers: {
          'Content-Type': 'application/json', // Tell the backend we're sending JSON
        },
        body: JSON.stringify(availabilityData), // Send the data as a JSON string
      });

      // Check if the response was successful (status code 2xx)
      if (!response.ok) {
        // If not successful, throw an error with the status
        const errorData = await response.json(); // Try to read error message from backend
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      // Parse the JSON response from the backend
      const data = await response.json();

      // Update the state with the generated code
      setGeneratedCode(data.code);
      console.log("Availability slot created with code:", data.code); // Log for debugging

    } catch (err) {
      // Handle errors during the fetch request
      console.error("Error creating availability slot:", err);
      setError(err.message); // Display the error message
    } finally {
      // This block runs regardless of success or failure
      setLoading(false); // Set loading state back to false
      // Clear the form fields after submission
      setStartTime('');
      setEndTime('');
      setDescription('');
    }
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-semibold mb-4 text-orange-300">
        Set Your Salmon Run Availability
      </h2>

      {/* The form */}
      <form onSubmit={handleSubmit} className="space-y-4"> {/* space-y-4 adds vertical space between form elements */}
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-300 mb-1">Start Time:</label>
          <input
            type="datetime-local" // Input type for date and time
            id="startTime"
            value={startTime} // Input value controlled by state
            onChange={(e) => setStartTime(e.target.value)} // Update state when input changes
            required // Make this field required
            className="w-full px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-white focus:outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-1">End Time:</label>
          <input
            type="datetime-local" // Input type for date and time
            id="endTime"
            value={endTime} // Input value controlled by state
            onChange={(e) => setEndTime(e.target.value)} // Update state when input changes
            required // Make this field required
            className="w-full px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-white focus:outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description (Optional):</label>
          <input
            type="text"
            id="description"
            value={description} // Input value controlled by state
            onChange={(e) => setDescription(e.target.value)} // Update state when input changes
            className="w-full px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-white focus:outline-none focus:border-orange-400"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:shadow-outline disabled:opacity-50"
          disabled={loading} // Disable button while loading
        >
          {loading ? 'Creating...' : 'Create Availability'} {/* Change button text while loading */}
        </button>
      </form>

      {/* Display status messages below the form */}
      {generatedCode && ( // Only show this if generatedCode has a value
        <div className="mt-4 p-4 bg-green-600 text-white rounded-md text-center">
          <p className="font-semibold">Availability created successfully!</p>
          <p className="text-lg">Share this code: <strong className="text-xl">{generatedCode}</strong></p>
        </div>
      )}

      {error && ( // Only show this if there's an error
        <div className="mt-4 p-4 bg-red-600 text-white rounded-md text-center">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

    </div>
  );
}

export default CreateAvailability;