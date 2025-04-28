// src/components/AvailabilityDisplay/AvailabilityDisplay.jsx
import React, {useState, useEffect, useCallback, Fragment} from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';



function AvailabilityDisplay(){
	// State variables for the list of available slots
	const [availableSlots, setAvailableSlots] = useState([]);           //init as empty array
	// State to track loading status
	const[isLoadingHostSlots, setIsLoadingHostSlots] = useState(true);  // Start as true, loading initially
	// State to store any fetch errors
	const [hostSlotsError, setHostSlotsError] = useState(null);         // Start with no error


	// State for Official Schedule
	const [officialSchedule, setOfficialSchedule]                   = useState(null);  // Store coopGroupingSchedule object
	const [isLoadingOfficialSchedule, setIsLoadingOfficialSchedule] = useState(true);  //Loading state for external API
	const [officialScheduleError, setOfficialScheduleError]         = useState(null);  // Error state for external API
	const[expandedShiftStartTime, setExpandedShiftStartTime]        = useState(null);  // Track clicked/expanded shift


	// State for the booking process
	const [selectedSlotId, setSelectedSlotId]         = useState(null);   // Track which slot ID is being booked
	const [friendCode, setFriendCode]                 = useState('');     // Input for Friend Code
	const [message, setMessage]                       = useState('');     // Input for Message
	const [isBookingLoading, setIsBookingLoading]     = useState(false);  // Loading state for booking POST
	const [bookingError, setBookingError]             = useState(null);   // Error state for booking POST
	const [lastVisitorCode, setLastVisitorCode]       = useState(null);   // Holds the code from the LAST successful booking
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);  // For controlling hte success modal
	const hostContactInfo                             = "DC#3511";        // To be moved later to props or context



	// --- Helper Function formatDateHeader to return a consistent date string (e.g., "Thursday, SEptember 19, 2024")
	const formatDateHeader = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('zh-CN', {
			weekday:'long',
			year: 'numeric',
			month:'long',
			day: 'numeric'
		}).format(date);
	};
	
	
	// --- Helper Function formatDate to return the time string (e.g., "2:30PM")
	const formatTime = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('zh-CN', {
			hour12: true,
			hour:'numeric',
			minute: '2-digit',
		}).format(date);
	};


	// --- Function fetchSlots using useCallback ---
	// useCallback memoizes the function definition, preventing unneccessary re-creations
	// which can be important if passed as a prop or used in dependency arrays.
	const fetchAllData = useCallback(async () => {
		// Set loading states for both fetches
		setIsLoadingHostSlots(true);
		setIsLoadingOfficialSchedule(true);
		setHostSlotsError(null);
		setOfficialScheduleError(null);
		console.log("Fetching host availability and official schedule...");


		try {
			// Use Promise.all to fetch concurrently
			const [hostResponse, officialResponse] = await Promise.all([
				fetch('http://localhost:3001/api/availability'),     // Our backend
				fetch('https://splatoon3.ink/data/schedules.json')  // Ink Api
			]);
			

			// --- Process Host Availability Response ---
			if (!hostResponse.ok){
				throw new Error(`Host Availability fetch failed: ${hostResponse.status}`);
			}
			const hostData = await hostResponse.json();
			setAvailableSlots(hostData); // Update state for host slots
			console.log("Host availability fetched:", hostData.length, "slots");
			setIsLoadingHostSlots(false);


			// --- Process Official Schedule Response ---
			if (!officialResponse.ok){
				throw new Error(`Pulling Official Schedule Error! Status: ${scheduleResponse.status}`);
			}
			const officialData = await officialResponse.json();
			// Extract only the Salmon Run shifts
			if (officialData.data?.coopGroupingSchedule){
				setOfficialSchedule(officialData.data.coopGroupingSchedule);
				console.log("Ink api SR schedule fetched successfully.")
			} else {
				// Handle cases where the expected structure isn't found
				console.error("Unexpected structure in official schedule data:", officialData);
				throw new Error("Could not find Salmon Run schedule in official data")
			}
			setIsLoadingOfficialSchedule(false);


		} catch (err) {
			console.error("Error fetching data:", err);
			// Determine which fetch failed if possible, or set a general error
        	// For simplicity, we'll set both errors if Promise.all fails,
        	// or specific errors if one response was checked before the throw
			if (!officialSchedule) setOfficialScheduleError(err.message);
			if (availableSlots.length === 0) setHostSlotsError(err.message); // Only set if still empty
			setBookingError(err.message); // Keep general error state? Or remove if using specific ones.

			setHostSlotsError(err.message);
			setAvailableSlots([]); // Clear slots on error
		} finally {
			// Ensure loading state are false on error
			setIsLoadingHostSlots(false);
			setIsLoadingOfficialSchedule(false);
		}
	}, []); // Empty dependency array: function definition doesn't depend on props/state 


	// --- useEffect to fetch slots on mount ---
	useEffect(() => {
		// Call the function defined above when the component mounts
		fetchAllData();

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
		
	}, [fetchAllData]); // Include fetchSlots in dependency array as per linting rules with useCallback


	// --- Function handleBookClick ---
	const handleBookClick = (slotId) => {
		console.log("Booking slot ID:", slotId);
		setSelectedSlotId     (slotId);  // Set the ID of the slot to be booked
		setBookingError       (null);    // Clear previous booking errors
		setLastVisitorCode    (null);    // Clear previsous code
		setIsSuccessModalOpen (false);   // Clear Success Modal state

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
			fetchAllData();


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

	console.log('rendering check:', {
		isLoadingHostSlots,
		isLoadingOfficialSchedule,
		hostSlotsError,
		officialScheduleError,
		officialScheduleExists: !!officialSchedule,
		availableSlotsLength: availableSlots.length
	});
	console.log(' --- official schedule content ---')
	console.log(officialSchedule);

	return (
		<div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full">

			{/* --- Title --- */}
			<h2 className='text-2xl font-semibold mb-4 text-cyan-300'> 
				可预约的时间
			</h2>
			<p className='text-lg font-semibold text-orange-300 mb-2'> 
				当地时间
			</p>


			{/* --- Display Area for Slots List --- */}
			{/* --- Title --- */}
			<h2 className='text-lg font-semibold mb-4 text-cyan-300'>
				Official Schedule & My Availability
			</h2>


			{/* --- Loading / Error States for *both* fetches --- */}
			{(isLoadingHostSlots || isLoadingOfficialSchedule) && (
				<p className='text-gray-400'>Loading schedules...</p>
			)}
			{hostSlotsError && <p className='text-red-400'>Error loading my availability: {hostSlotsError}</p>}
			{officialScheduleError && <p className='text-red-400'>Error loading official schedule: {officialScheduleError}</p>}


			{/* --- Display Official Schedules (Only if both loaded successfully) --- */}
			{!isLoadingHostSlots && !isLoadingOfficialSchedule && !hostSlotsError && !officialScheduleError && officialSchedule && (
				<div className='space-y-6'>
					{/* --- Section for Regular Schedules --- */}
					{officialSchedule.regularSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className='text-xl font-semibold text-orange-300 mb-3'>Upcoming Shifts</h3>
							<div className='space-y-4'>
								{officialSchedule.regularSchedules?.nodes.map(shift => (
									// Use optional chaning for potentially missing nested properties
									<p key={shift.startTime}>
										Regular Shift: {shift.setting?.coopStage?.name ?? 'Unknown Stage'} ({shift.startTime})
									</p> // Placeholder
									// <OfficialShiftCard shift={shift} hostAvailability={availableSlots} onExpand={handleExpandShift} /> // TODO: Use this later
								))}
							</div>
						</div>
					)}

					{/* --- Section for Big Run --- */}
					{officialSchedule.bigRunSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className="text-xl font-semibold text-red-400 mb-3">!!! Big Run Active !!!</h3>
							<div className="space-y-4">
								{officialSchedule.bigRunSchedules?.nodes.map(shift => (
									<p key={shift.startTime}>
										Big Run: {shift.setting?.coopStage?.name ?? 'Unknown Stage'} ({shift.startTime})
									</p> // Placeholder
									// <OfficialShiftCard shift={shift} hostAvailability={availableSlots} onExpand={handleExpandShift} /> // TODO: Use this later
								))}
							</div>
						</div>
					)}


					{/* --- Section for Team Contest --- */}
					{officialSchedule.teamContestSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className="text-xl font-semibold text-purple-400 mb-3">Team Contest</h3>
							<div className="space-y-4">
								{officialSchedule.teamContestSchedules?.nodes.map(shift => (
									// NOTE: Team Contest might have different 'setting' structure.
									<p key={shift.startTime}>
										Regular Shift: {shift.setting?.coopStage?.name ?? 'Unknown Stage'} ({shift.startTime})
									</p> // Placeholder
									// Need to adapt card display slightly for team contest if needed
									// <OfficialShiftCard shift={shift} hostAvailability={availableSlots} onExpand={handleExpandShift} /> // TODO: Use this later
								))}
							</div>
						</div>
					)}
					{/* If no schedules found at all */}
					{!officialSchedule.regularSchedules?.nodes?.length && 
					!officialSchedule.bigRunSchedules?.nodes?.length && 
					!officialSchedule.teamContestSchedules?.nodes?.length && (
						<p className='text-gray-400'>No upcoming Salmon Run schedules found in the Ink api data</p>
					)}



				</div>
			)}
			{/* --- End Display Area for Slots List --- */}


			{/* --- Detail View for Expanded Shift (Placeholder) */}
			{expandedShiftStartTime && (
				<div className='mt-6 p-4 bg-gray-600 rounded-lg border border-yellow-500'>
					<h3 className='text-lg font-semibold mb-2 text-yellow-300'>
						Your Available Slots for Shift starting {formatDateHeader(expandedShiftStartTime)} {/* Example usage */}
					</h3>
					{/* TODO: Filter availableSlots based on expandedShiftStartTime and render the list + book buttons */}
					<p className='text-gray-400'>(Detailed slots will appear here)</p>
				</div>
			)}
			
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
			{/* No longer need <Transition> component here */}
			<Dialog open={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} className="relative z-50">
				{/* The backdrop, with transition prop and classes */}
				<DialogBackdrop
					transition // Enable transition feature for backdrop
					className="fixed inset-0 bg-black/30 duration-300 ease-out data-[closed]:opacity-0" // Use data-[closed] variant
				/>


				{/* Full-screen container to center the panel */}
				<div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
					{/* The actaul dialog panel, with transition prop and classes */}
					<DialogPanel
						transition // Enable transition feature for panel
						className="w-full max-w-md transform space-y-4 overflow-hidden rounded-2xl bg-gray-800 border 	border-green-500 p-6 text-left align-middle shadow-xl duration-300 ease-out data-[closed]:scale-95 data-	[closed]:opacity-0" // Use data-[closed] variant for combined effect
					>
						{/* Dislog Title */}
						<DialogTitle
							as='h3'
							className="text-xl font-bold leading-6 text-green-300 text-center mb-4"
						>
							🎉 预约成功（还需要最后确认）🎉
						</DialogTitle>


						{/* Display the Visitor Code (no changes needed inside) */}
						<div className='mt-2 text-center'>
							<p className='text-sm text-gray-400 mb-1'>
								请保管好您的数字ID（点击复制)
							</p>
							<p className='text-2xl font-mono font-bold bg-gray-900 text-white py-2 px-4 rounded-md inline-block mb-4 select-all'>
								{lastVisitorCode}
							</p>
						</div>

						{/* Display Host Contact Info and Instructions (no changes needed inside) */}
						<div className='mt-4 p-3 bg-gray-700 rounded text-center text-sm border border-gray-600'>
							<p className='font-semibold mb-1 text-orange-300'>Next Step: Final Confirmation</p>
							<p className='text-gray-300'>
								To finalize this session, please send your Visitor Code ({lastVisitorCode}) to the host via Discord:
							</p>
							<p className='mt-1'>
								<span className='font-mono bg-gray-900 px-2 py-1 rounded text-white'>{hostContactInfo}</span>
							</p>
						</div>

						{/* Close button (no changes needed inside) */}
						<div className='mt-6 text-center'>
							<button
								type='button'
								className='inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900'
								onClick={() => setIsSuccessModalOpen(false)}
							>
								Okay, Got it!
							</button>
						</div>
					</DialogPanel>
				</div>
			</Dialog>
			{/* --- End Headless UI Success Modal --- */}
		</div>
	);
}

export default AvailabilityDisplay;