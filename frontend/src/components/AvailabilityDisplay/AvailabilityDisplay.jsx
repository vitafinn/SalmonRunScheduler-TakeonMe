import React, {useState, useEffect, useCallback, Fragment, use} from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import OfficialShiftCard from '../OfficialShiftCard/OfficialShiftCard';
import {formatDateHeader as dateUtilsFormatDateHeader, formatTime as dateUtilsFormatTime} from '../../utils/dateUtils'
import { useTranslations } from '../../hooks/useTranslations';
import ShiftDetailModal from '../ShiftDetailModal/ShiftDetailModal';



function AvailabilityDisplay(){
	// --- Get Translation Stuff from Hook ---
	const { currentLocale, changeLocale, t, isLoadingLocale, localeError } = useTranslations();

	// --- State for Host Slots ---
	const [availableSlots, setAvailableSlots] = useState([]);           //init as empty array
	const[isLoadingHostSlots, setIsLoadingHostSlots] = useState(true);  // Start as true, loading initially
	const [hostSlotsError, setHostSlotsError] = useState(null);         // Start with no error


	// --- State for Official Schedule ---
	const [officialSchedule, setOfficialSchedule]                   = useState(null);  // Store coopGroupingSchedule object
	const [isLoadingOfficialSchedule, setIsLoadingOfficialSchedule] = useState(true);  //Loading state for external API
	const [officialScheduleError, setOfficialScheduleError]         = useState(null);  // Error state for external API


	// --- State for  UI Interaction ---
	//const [expandedShiftStartTime, setExpandedShiftStartTime] = useState(null);   // Track clicked/expanded shift
	const [isDetailModalOpen, setIsDetailModalOpen]           = useState(false);
	const [detailShiftData, setDetailShiftData]               = useState(null);

	const [selectedSlotId, setSelectedSlotId]                 = useState(null);   // Track which slot ID is being booked
	const [friendCode, setFriendCode]                         = useState('');     // Input for Friend Code
	const [message, setMessage]                               = useState('');     // Input for Message
	const [isBookingLoading, setIsBookingLoading]             = useState(false);  // Loading state for booking POST
	const [bookingError, setBookingError]                     = useState(null);   // Error state for booking POST
	const [lastVisitorCode, setLastVisitorCode]               = useState(null);   // Holds the code from the LAST successful booking
	const [isSuccessModalOpen, setIsSuccessModalOpen]         = useState(false);  // For controlling hte success modal
	const hostContactInfo                                     = "DC#3511";        // To be moved later to props or context


	// --- Helper function to check for overlap ---
	const checkShiftOverlap = (shiftStartTime, shiftEndTime, hostSlots) => {
		// Convert shift boundaries to Date objects for comparison
		const shiftStart = new Date(shiftStartTime);
		const shiftEnd = new Date(shiftEndTime);


		// Use .some() to check if AT LEAST ONE host slot overlaps
		// .some() stops checking as soon as it finds a match (efficient)
		return hostSlots.some(hostSlot => {
			const hostStart = new Date(hostSlot.start_time);
			const hostEnd = new Date(hostSlot.end_time);


			// Overlap condition:
			// Host slot starts BEFORE shift ends AND Host slot ends AFTER shift starts
			const overlaps = hostStart < shiftEnd && hostEnd > shiftStart;


			// Debugging log
			if (overlaps) {
				console.log(`Overlap found: Shift ${shiftStart.toISOString()}-${shiftEnd.toISOString()} overlaps with Host Slot ${hostStart.toISOString()}-${hostEnd.toISOString()}`);
			}
			return overlaps;
		});
	};


	// --- Function fecth data ---
	// useCallback memoizes the function definition, preventing unneccessary re-creations
	// which can be important if passed as a prop or used in dependency arrays.
	const fetchSchedulesAndHostSlots = useCallback(async () => {
		// Set ALL loading states true
		setIsLoadingHostSlots(true);
		setIsLoadingOfficialSchedule(true);
		setHostSlotsError(null);
		setOfficialScheduleError(null);

		// Debug: temp clear data on new fetch attempt
		setAvailableSlots([]); // Clear data visually during load
		setOfficialSchedule(null);
		console.log("Fetching host availability and official schedule...");
		

		let hostData = null; // Declare variables outside try
		let officialDataRaw = null; // To store the raw response
		let proccessedSchedule = null;

		
		try {
			const [hostResponse, officialResponse] = await Promise.all([
				fetch('http://localhost:3001/api/availability'),       // Our backend
				fetch('https://splatoon3.ink/data/schedules.json'),     // Ink Api
			]);


			// --- Check BOTH responses first ---
			if (!hostResponse.ok){throw new Error(`Host Availability fetch failed: ${hostResponse.status}`);}
			if (!officialResponse.ok){throw new Error(`Official Schedule fetch failed: ${scheduleResponse.status}`);}


			// --- Parse BOTH responses ---
			// Assign to the variables declared outside
			hostData = await hostResponse.json();
			officialDataRaw = await officialResponse.json();


			// --- Process Official Schedule Data ---
			if (officialDataRaw.data?.coopGroupingSchedule) {
				proccessedSchedule = officialDataRaw.data.coopGroupingSchedule; // Stroe processed data
				console.log("Official schedule proccessed successfully");
			} else {
				throw new Error("Could not find SR schedule in ooficial data")
			}


			// --- Update State AFTER all processing is successul ---
			setAvailableSlots(hostData);
			setOfficialSchedule(proccessedSchedule);
			console.log("Host availability and official schedule states updated.");


		} catch (err) {

			console.error("Error during fetch or processing:", err);
			// Set general error states, assuming either fetch might have failed
			setHostSlotsError(`Failed to load data: ${err.message}`);
			setOfficialScheduleError(`Failed to load data: ${err.message}`);

			// Clear any potentially partial data
			setAvailableSlots([]);
			setOfficialSchedule(null);
		} finally {
			setIsLoadingHostSlots(false);
			setIsLoadingOfficialSchedule(false);
			console.log("Fetch function finished.")
		}
	}, []); // Dependencies might need adjustment


	// --- useEffect now only calls fetchSchedulesAndHostSlots ---
	useEffect(() => {
		// Call the function defined above when the component mounts
		fetchSchedulesAndHostSlots();

		// --- loadStorage Load Logic ---
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
		// --- End Local Storage Logic ---
		
	}, []); // Include fetchSlots in dependency array as per linting rules with useCallback. Or potentially just [] if fetch doesn't need deps


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


	// Now we just need the dateUtils functions
	const formatDateHeader = (dateString) => {
		// Use imported function, passing currentLocale from the hook
		return dateUtilsFormatDateHeader(dateString, currentLocale);
	};
	const formatTime = (dateString) => {
		// Use imported function, passing currentLocale from the hook
		return dateUtilsFormatTime(dateString, currentLocale);
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
			<div className='flex justify-between items-center mb-4'>
				<h2 className='text-lg font-semibold mb-4 text-cyan-300'>
					Official Schedule & My Availability
				</h2>
				{/* Use changeLocale from the hook */}
				<button
					onClick={() => changeLocale(currentLocale === 'en-US' ? 'zh-CN' : 'en-US')}
					className='text-sm bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded'
					disabled={isLoadingLocale} // Disable based on hook's loading state
					title='Switch Language'
				>
					{currentLocale === 'en-US' ? '中文' : 'English'}
				</button>
			</div>

			
			{/* --- Loading/Error States for *both* fetches --- */}
			{(isLoadingHostSlots || isLoadingOfficialSchedule || isLoadingLocale) && (
				<p className='text-gray-400'>Loading schedules...</p>
			)}
			{hostSlotsError && <p className='text-red-400'>Error loading my availability: {hostSlotsError}</p>}
			{officialScheduleError && <p className='text-red-400'>Error loading official schedule: {officialScheduleError}</p>}
			{localeError && <p className='text-red-400'>Error loading language data: {localeError}</p>}


			{/* --- Display Official Schedules (Only if both loaded successfully) --- */}
			{!isLoadingHostSlots && !isLoadingOfficialSchedule && !isLoadingLocale && !hostSlotsError && !officialScheduleError && !localeError && officialSchedule && (
				<div className='space-y-6'>
					{/* --- Section for Regular Schedules --- */}
					{officialSchedule.regularSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className='text-xl font-semibold text-orange-300 mb-3'>Upcoming Shifts</h3>
							<div className='space-y-4'>
								{officialSchedule.regularSchedules?.nodes.map(shift => {
									// Calculate overlap for this shift
									const hasOverlap = checkShiftOverlap(shift.startTime, shift.endTime, availableSlots);


									// Define the click handler for *this* specific shift
									const handleExpandClick = () => {
										if (hasOverlap) {
											console.log("Expanding shift:", shift.startTime);
											setDetailShiftData(shift); // Store the whole shift object
											setIsDetailModalOpen(true); // Open the detail modal
											// Clear any booking form state if a new shift is expanded
											setSelectedSlotId(null);
											setBookingError(null);
										}
									};


									return(
										<OfficialShiftCard
											key={shift.startTime}
											shift={shift}		
											t={t}
											currentLocale = {currentLocale} // Locale from hook
											hasOverlap={hasOverlap}
											onExpand={handleExpandClick} // Handler function
										/>
									);
								})}
							</div>
						</div>
					)}

					{/* --- Section for Big Run --- */}
					{officialSchedule.bigRunSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className="text-xl font-semibold text-red-400 mb-3">!!! Big Run Active !!!</h3>
							<div className="space-y-4">
								{officialSchedule.regularSchedules?.nodes.map(shift => {
									// Calculate overlap for this shift
									const hasOverlap = checkShiftOverlap(shift.startTime, shift.endTime, availableSlots);
									return(
										<OfficialShiftCard
											key={shift.startTime}
											shift={shift} // Pass shift data as prop, use startTime as key			
											t={t}
											currentLocale = {currentLocale} // Locale from hook
											// --- Pass new props ---
											hasOverlap={hasOverlap} // Boolean indicating if host is available during this shift
											onExpand={() => setExpandedShiftStartTime(shift.startTime)} // Function to call when card is clicked
										/>
									);
								})};
							</div>
						</div>
					)}


					{/* --- Section for Team Contest --- */}
					{officialSchedule.teamContestSchedules?.nodes?.length > 0 && (
						<div>
							<h3 className="text-xl font-semibold text-purple-400 mb-3">Team Contest</h3>
							<div className="space-y-4">
								{officialSchedule.regularSchedules?.nodes.map(shift => {
									// Calculate overlap for this shift
									const hasOverlap = checkShiftOverlap(shift.startTime, shift.endTime, availableSlots);
									return(
										<OfficialShiftCard
											key={shift.startTime}
											shift={shift} // Pass shift data as prop, use startTime as key			
											t={t}
											currentLocale = {currentLocale} // Locale from hook
											// --- Pass new props ---
											hasOverlap={hasOverlap} // Boolean indicating if host is available during this shift
											onExpand={() => setExpandedShiftStartTime(shift.startTime)} // Function to call when card is clicked
										/>
									);
								})};
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


			{/* Shift Detail Modal */}
			<ShiftDetailModal
				isOpen={isDetailModalOpen}
				onClose={() => setIsDetailModalOpen(false)}
				shiftData={detailShiftData}
				hostAvailability={availableSlots}
				t={t}
				currentLocale={currentLocale}
				handleBookClick={handleBookClick}
				selectedSlotId={selectedSlotId}
				isBookingLoading={isBookingLoading}
			/>


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