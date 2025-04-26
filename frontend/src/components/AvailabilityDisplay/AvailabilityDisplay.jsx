// src/components/AvailabilityDisplay/AvailabilityDisplay.jsx
import React, {useState, useEffect} from 'react';



function AvailabilityDisplay(){
	// State variables for the list of available slots
	const [availableSlots, setAvailabilitySlots] = useState([]); //init as empty array
	// State to track loading status
	const[isLoading, setIsLoading] = useState(true); // Start as true, loading initially
	// State to store any fetch errors
	const [error, setError] = useState(null); // Start with no error

	// State for the booking process
	const [selectedSlotId, setSelectedSlotId] = useState(null); // Track which slot ID is being booked
	const [friendCode, setFriendCode] = useState(''); // Input for Friend Code
	const [message, setMessage] = useState(''); // Input for Message
	const [isBookingLoading, setIsBookingLoading] = useState(false); // Loading state for booking POST
	const [bookingError, setBookingError] = useState(null); // Error state for booking POST
	const [bookingSuccess, setBookingSuccess] = useState(null); // Success message + visitor code


	useEffect(() => {
		// Define the function to fetch slots
		const fetchSlots = async () => {
			setIsLoading(true); // Set loading true at the start of fetch
			setError(null); // Clear previous errors

			try {
				// Make the GET request to backend endpoint
				const response = await fetch('http://localhost:3001/api/availability'); // Use the correct backend URL


				// Check if the response status is OK (200)
				if (!response.ok){
					// if not OK, throw an error to be caught below
					throw new Error(`HTTP error! Status: ${response.status}`);
				}


				// Parse the JSON response body
				const data = await response.json();


				// Update the state with the fetched slots
				setAvailabilitySlots(data);

			} catch (err) {
				// If any error occured during fetch or parsing, update the error state
				console.error("Error fetching available slots:", err);
				setError(err.message); // Store the error message
			} finally {
				// This block runs regardless of success or failure
				setIsLoading(false); // Set loading false once fetch is complete
			}
		};


		// Call the fetch function
		fetchSlots();
	}, []);


	// Function called when a "Book" button is clicked
	const handleBookClick = (slotId) => {
		console.log("Booking slot ID:", slotId);
		setSelectedSlotId(slotId); // Set the ID of the slot to be booked
		setBookingError(null); // Clear previous booking errors
		setBookingSuccess(null); // Clear previous success message
		setFriendCode('') // Clear previous form inputs
		setMessage(''); // Clear previous form inputs
	};


	// Function to handle closing the booking form/modal
	const handleCancelBooking = () => {
		setSelectedSlotId(null); // Clear the selected slot ID
		setBookingError(null);
		setBookingSuccess(null);
	};


	// Function called when the booking form is submitted
	const handleBookingSubmit = async (event) => {
		event.preventDefault();
		setIsBookingLoading(true);
		setBookingError(null);
		setBookingSuccess(null);


		console.log(`Submitting booking for Slot ID: ${selectedSlotId}, Friend Code: ${friendCode}`);


		// --- Placeholder for Fetch POST Request ---
		// We will add the actual fetch logic here in the next step
		try {
			// Simulate network request for now
			await new Promise(resolve => setTimeout(resolve, 1500));

			//TODO: Replace simulation with actual fetch POST to /api/bookings


			// --- Simulate Success ---
			const simulatedVistorCode = "TEST" + Math.floor(Math.random() * 10000);
			setBookingSuccess(`Booking successful! Your code: ${simulatedVistorCode}`);
			setSelectedSlotId(null); // Close the form on success
			//TODO: We also need to refresh the avaialbeSlots list here after real success
		} catch (err) {
			console.error("Booking failed:", err);
			setBookingError(err.message || "Booking failed. Please try again.");
		} finally {
			setIsBookingLoading(false);
		}
	};
	
	
	return (
		<div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full">
			<h2 className='text-2xl font-semibold mb-4 text-cyan-300'> 
				Available Slots 
			</h2>


			{/* --- Display Area for Slots List --- */}
			{isLoading && <p className='text-gray-400'>Loading available slots...</p>}
			{error && <p className='text-red-400'>Error loading slots: {error}</p>}
			{!isLoading && !error && availableSlots.length === 0 && (
				<p className='text-gray-400'>No available slots found at the moment.</p>
			)}
			{!isLoading && !error && availableSlots.length > 0 && (
				<ul className='space-y-3'> {/* List only shows if slots exist */}
					{availableSlots.map((slot) => (
						<li key = {slot.id} className='bg-gray-600 p-3 rounded-md flex justify-between items-center'>
							<span className='text-white'>
								{/* Basic formatting, improve later if needed */}
								{new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleString()}
							</span>
							<button
								onClick={() => handleBookClick(slot.id)} 
								className='bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm'
								disabled={isBookingLoading || selectedSlotId === slot.id} // Disable if booking is in progress or this slot is selected
							>
								Book
							</button>
						</li>
					))}
				</ul>
			)}
			{/* --- End Display Area for Slots List --- */}

			
			{/* --- Booking Form (Rendered separately, below the list area) --- */}
			{selectedSlotId !== null && ( // Only show form if a slot is selected
				<div className="mt-6 p-4 bg-gray-600 rounded-lg border border-cyan-500">
					<h3 className="text-xl font-semibold mb-3 text-cyan-300">
						Book Slot ID: {selectedSlotId}
					</h3>
					<form onSubmit={handleBookingSubmit} className="space-y-4">
						<div>
							<label htmlFor="friendCode" className="block text-sm font-medium text-gray-300 mb-1">
								Your Friend Code: <span className="text-red-400">*</span>
							</label>
							<input
								type="text"
								id="friendCode"
								value={friendCode}
								onChange={(e) => setFriendCode(e.target.value)}
								required
								className="w-full px-3 py-2 rounded-md bg-gray-500 border border-gray-400 text-white focus:outline-none focus:border-cyan-400"
								placeholder="SW-XXXX-XXXX-XXXX"
							/>
						</div>
						<div>
							<label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
								Message (Optional):
							</label>
							<textarea
								id="message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows="2"
								className="w-full px-3 py-2 rounded-md bg-gray-500 border border-gray-400 text-white focus:outline-none focus:border-cyan-400"
								placeholder="Any notes for the host?"
							/>
						</div>
				

						{/* Display Booking Status */}
						{isBookingLoading && <p className="text-yellow-400">Submitting booking...</p>}
						{bookingError && <p className="text-red-400">Error: {bookingError}</p>}
						{/* Success message is handled outside/after closing the form for now */}
				
				
						<div className="flex justify-end space-x-3">
							<button
								type="button" // Important: type="button" to prevent form submission
								onClick={handleCancelBooking}
								className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
								disabled={isBookingLoading} // Disable while submitting
							>
								Cancel
							</button>
							<button
								type="submit"
								className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
								disabled={!friendCode || isBookingLoading} // Disable if no friend code or submitting
							>
								{isBookingLoading ? 'Booking...' : 'Confirm Booking'}
							</button>
						</div>
					</form>
				</div>
			)}
			{/* --- End Booking Form --- */}


			{/* --- Display overall booking success message below the form area --- */}
			{bookingSuccess && (
				<div className="mt-4 p-3 bg-green-600 text-white rounded-md text-center">
					{bookingSuccess}
				</div>
			)}
			{/* --- End Booking Success Message */}

		</div>
	);
}

export default AvailabilityDisplay;