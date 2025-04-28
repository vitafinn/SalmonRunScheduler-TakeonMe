// src/components/AvailabilityDisplay/AvailabilityDisplay.jsx
import React, {useState, useEffect, useCallback, Fragment} from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';



function AvailabilityDisplay(){
	// State variables for the list of available slots
	const [availableSlots, setAvailabilitySlots] = useState([]);  //init as empty array
	// State to track loading status
	const[isLoading, setIsLoading] = useState(true);              // Start as true, loading initially
	// State to store any fetch errors
	const [error, setError] = useState(null);                     // Start with no error

	// State for the booking process
	const [selectedSlotId, setSelectedSlotId]               = useState(null);   // Track which slot ID is being booked
	const [friendCode, setFriendCode]                       = useState('');     // Input for Friend Code
	const [message, setMessage]                             = useState('');     // Input for Message
	const [isBookingLoading, setIsBookingLoading]           = useState(false);  // Loading state for booking POST
	const [bookingError, setBookingError]                   = useState(null);   // Error state for booking POST
	const [lastVisitorCode, setLastVisitorCode]             = useState(null);   // Holds the code from the LAST successful booking
	const [isSuccessModalOpen, setIsSuccessModalOpen]       = useState(false);  // For controlling hte success modal



	// --- Define fetchSlots function using useCallback ---
	// useCallback memoizes the function definition, preventing unneccessary re-creations
	// which can be important if passed as a prop or used in dependency arrays.
	const fetchSlots = useCallback(async () => {
		console.log("Fetching available slots..."); // Added log
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch('http://localhost:3001/api/availability');
			if (!response.ok){
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const data = await response.json();
			setAvailabilitySlots(data);
		} catch (err) {
			console.error("Error fetching available slots:", err);
			setError(err.message);
			setAvailabilitySlots([]); // Clear slots on error
		} finally {
			setIsLoading(false);
		}
	}, []); // Empty dependency array: function definition doesn't depend on props/state 


	// --- useEffect to fetch slots on mount ---
	useEffect(() => {
		// Call the function defined above when the component mounts
		fetchSlots();
	}, [fetchSlots]); // Include fetchSlots in dependency array as per linting rules with useCallback


	// --- Function handleBookClick ---
	const handleBookClick = (slotId) => {
		console.log("Booking slot ID:", slotId);
		setSelectedSlotId     (slotId);  // Set the ID of the slot to be booked
		setBookingError       (null);    // Clear previous booking errors
		setLastVisitorCode    (null);    // Clear previsous code
		setIsSuccessModalOpen (false);   // Clear Success Modal state
		
		// Check local storage for previously saved friend code
		try {
			const storedFriendCode = localStorage.getItem('friendCode');
			console.log("Read from localStorage, storedFriendCode:", storedFriendCode);
			if (storedFriendCode) {
				// If found, update the component's state
				setFriendCode(storedFriendCode); // Pre-fill the state vairable
				console.log("Set friendCode state to:", storedFriendCode);
			} else {
				// If not found, ensure the state is cleared (redundant but safe)
				setFriendCode('');
			}
			// We could also load the visitorBookingCode here if needed elsewhere later
			// const storeVisitorCode = localStorage.getItem('visitorBookingCode');
			// if (storeVisitorCode) {...}
		} catch (storageError) {
			console.warn("Could not read friend code from Local Storage:", storageError)
			setFriendCode('');
		}
		// --- End Local Storage Check ---
		setMessage('');
	};


	// Function to handle closing the booking form/modal
	const handleCancelBooking = () => {
		setSelectedSlotId(null); // Clear the selected slot ID
		setBookingError(null);
		setBookingSuccessMessage(null);
	};


	// Function called when the booking form is submitted
	const handleBookingSubmit = async (event) => {
		// Prevent default form behavior (page reload)
		event.preventDefault();


		// -- 1. Set Loading and clear Statuese --
		// Update state to indicate the booking process has started
		setIsBookingLoading(true);
		setBookingError(null);

		console.log(`Submitting booking for Slot ID: ${selectedSlotId}, Friend Code: ${friendCode}`);


		// -- 2. Prepare Data for API Request --
		// Create a JavaScript object containing the data the backend expects
		const bookingData = {
			slotId: selectedSlotId, // The ID of the slot the user cliked "Book" on
			friendCode: friendCode, // The NS SW friend code user enters
			message: message // The optional msg entered by user
		};


		// -- 3. Perform the API Call using fetch --
		// 'try...catch' block handles potential errors during the fetch process
		try {
			// 'fetch' is the browser's built-in function for making HTTP requests.
			// We 'await' its completion because it's asynchronous (doesn't happend instantly).
			const response = await fetch('http://localhost:3001/api/bookings',{ // Target our backend endpoint
				method:'POST', // Specify the HTTP method as POST (for creating data)
				headers: {
					// Headers tell the backend what kind of data we're sending
					'Content-Type': 'application/json', // We are sending data in JSON format
				},
				// 'body' contains the actual data to send.
				// 'JSON.stringify' converts our JavaScript 'bookingData' object into a JSON string.
				body: JSON.stringify(bookingData),
			});


			// -- 4. Handle the Backend's Response --
			// 'response.ok' is a boolean: true if status code is 200-299 (success)
			let errorMsg = `HTTP error! Status: ${response.status}`; // Default error
			if (!response.ok){
				// If the response status indicates and error (e.g., 400, 404, 409, 500)

				try{
					// Try to read the error message *sent by our backend* i nthe response body
					const errorData = await response.json(); // Assuming backend sends { "error": "message" }
					errorMsg = errorData.error || errorMsg; // Use backend message if available
				} catch (parseError) {
					// Ignore error if the response body wasn't valid JSON
					console.warn("Could not parse error response JSON:", parseError);
				
				}
				// Throw and error to jump to the 'catch' block below
				throw new Error(errorMsg);
			}


			// If response.ok was true, parse the successful JSON response from the backend
			const data = await response.json(); // Contains { message: "...", visitorBookingCode: "..."}


			// -- 5. Update State on Success --
			console.log("Booking successful:", data);
			// Set the success message including the visitor code from the backend
			setLastVisitorCode(data.visitorBookingCode); // Store the specific code
			setIsSuccessModalOpen(true);

			try{
				// Store the visitor's code in Local Storage for future use
				// localStorage only stores strings.
				localStorage.setItem('visitorBookingCode', data.visitorBookingCode);
				// 'friendCode' here is the state variable holding what the user submitted
				localStorage.setItem(`friendCode`, friendCode);
				console.log("Saved user info to Local Storage");
			} catch (storageError) {
				// Handle potential errors if localStorage is disabled or full
				console.warn("Could not save user ifo to Local Storage:", storageError);
				// This is not critical, so we don't show an error to the user
			}


			setSelectedSlotId(null); // Close the form by clearing the selected ID
			setFriendCode(''); // Clear the form field
			setMessage(''); // Clear the form field

			// --- IMPORTANT: Refresh list of available slots ---
			fetchSlots();


		} catch (err) {
			// -- 6. Update State on Error --
			// This block catches errors from fetch itself (network issues) or errors we threw above
			console.error("Booking submission failed:", err);
			// Set the error message to display to the user
			setBookingError(err.message || "Booking failed. Please try again.");
			setLastVisitorCode   (null);   // Clear previsous code
			setIsSuccessModalOpen(false);  //Ensure modal is closed on error
		} finally {
			// -- 7. Reset Loading State --
			// This 'finally' block runs whether the 'try' succeeded or the 'catch' handled an error
			setIsBookingLoading(false); // Set loading back to false
		}
	};
	
	const hostContactInfo = "DC_USRNAME#1234"; // To be moved later to props or context

	return (
		<div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full">

			{/* --- Title --- */}
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


			{/* --- Headless UI Success Modal --- */}
			<Transition appear show={isSuccessModalOpen} as={Fragment}>
				{/* 'appear' makes it transition on initial mount */}
				{/* 'show' controls visibility based on our state */}
				{/* 'as={Fragment}' avoids adding extra divs for the Transition itself */}
				<Dialog as='div' className="relative z-10" onClose={() => setIsSuccessModalOpen(false)}>
					{/* 'onClose is called when clicking overlay or pressing Esc */}
					{/* Background overlay with transition */}
					<TransitionChild
						as={Fragment}
						enter     = 'ease-out duration-300'  // Classes during enter transition
						enterFrom = 'opacity-0'
						enterTo   = 'opacity-100'
						leave     = 'ease-in duration-200'   //Classes during leave transition
						leaveFrom = 'opacity-100'
						leaveTo   = 'opacity-0'
					>
						<div className='fixed inset-0 bg-black bg-opacity-50'/> {/* The dimmed background */}
					</TransitionChild>


					<div className='fixed inset-0 overflow-y-auto'> {/* Container to center modal */}
						<div className='flex min-h-full items-center justify-center p-4 text-center'>
							{/* Transition effect for modal panel */}
							<TransitionChild
								as={Fragment}
								enter     = "ease-out duration-300"
								enterFrom = "opacity-0 scale-95"     // Start slightly smaller and faded out
								enterTo   = "opacity-100 scale-100"  // End at full size and opacity
								leave     = "ease-in duration-200"
								leaveFrom = "opacity-100 scale-100"
								leaveTo   = "opacity-0 scale-95"     // Shrink slightly and fade out
							>
								{/* --- Modal Content Panel --- */}
								<DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-green-500 p-6 text-left align-middle shadow-xl transition-all">
									<DialogTitle
										as='h3'
										className="text-xl font-bold leading-6 text-green-300 text-center mb-4"
									>
										🎉 Booking Confirmed (Action Required!) 🎉
									</DialogTitle>


									{/* Display the Visitor Code */}
									<div className='mt-2 text-center'>
										<p className='text-sm text-gray-400 mb-1'>
											Your Visitor Code (Keep this safe!)
										</p>
										<p className='text-2xl font-mono font-bold bg-gray-900 text-white py-2 px-4 rounded-md inline-block mb-4 select-all'>
											{lastVisitorCode}
										</p>
									</div>


									{/* Display Host Contact Info and Instructions */}

									<div className='mt-4 p-3 bg-gray-700 rounded text-center text-sm border border-gray-600'>
										<p className='font-semibold mb-1 text-orange-300'>Final Confirmation</p>
										<p className='text-gray-300'>
											Please send you Visitor Code ({lastVisitorCode}) to me via Discord:
										</p>
										<p className='mt-1'>
											<span className='font-mono bg-gray-900 px-2 py-1 rounded text-white'>				{hostContactInfo}</span>
										</p>
									</div>

									{/* --- Close button --- */}
									<div className='mt-6 text-center'>
										<button
											type='button'
											className='inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900'
											onClick={() => setIsSuccessModalOpen(false)} // Close the modal on click
										>
											Okay, Got it!
										</button>
									</div>
								</DialogPanel>
							</TransitionChild>
						</div>
					</div>
				</Dialog>
			</Transition>
			{/* --- End Headless UI Success Modal --- */}
		</div>
	);
}

export default AvailabilityDisplay;