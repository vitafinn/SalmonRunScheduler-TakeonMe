import React, {useState, useEffect, useCallback, Fragment} from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';


// Component Imports
import { useTranslations } from '../../hooks/useTranslations';
import ShiftDetailModal from '../ShiftDetailModal/ShiftDetailModal';
import ScheduleList from '../ScheduleList/ScheduleList';
import SuccessModal from '../SuccessModal/SuccessModal';
import BookingFormModal from '../BookingFormModal/BookingFormModal';
import { useScheduleData } from '../../hooks/useScheduleData';
import { useFormStatus } from 'react-dom';



function AvailabilityDisplay(){
	// --- Hooks ---
	const { currentLocale, changeLocale, t, isLoadingLocale, localeError } = useTranslations();
	const { officialSchedule, isLoadingSchedule, scheduleError }           = useScheduleData();

	// --- State for Host Slots ---
	const [availableSlots, setAvailableSlots]         = useState([]);    //init as empty array
	const [isLoadingHostSlots, setIsLoadingHostSlots] = useState(true);  // Start as true, loading initially
	const [hostSlotsError, setHostSlotsError]         = useState(null);  // Start with no error


	// --- State for  UI Interaction ---
	//const [expandedShiftStartTime, setExpandedShiftStartTime] = useState(null);   // Track clicked/expanded shift
	const [isDetailModalOpen, setIsDetailModalOpen]   = useState(false);
	const [detailShiftData, setDetailShiftData]       = useState(null);
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);  // Booking form
	const [slotDataForBooking, setSlotDataForBooking] = useState(null);	  // Booking form
	const [lastVisitorCode, setLastVisitorCode]       = useState(null);   // Holds the code from the LAST successful booking
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);  // For controlling hte success modal


	// --- State for Booking API Call Status ---
	const [isBookingLoading, setIsBookingLoading]     = useState(false);  // Loading state for booking POST
	const [bookingError, setBookingError]             = useState(null);   // Error state for booking POST


	// --- State derived from LocalStorage (for pre-filling) ---
	const [initialFriendCode, setInitialFriendCode]                 = useState('');

	//const [selectedSlotId, setSelectedSlotId]         = useState(null);   // Track which slot ID is being booked
	//const [message, setMessage]                       = useState('');     // Input for Message
	// --- Static Info ---
	const hostContactInfo                             = "DC#3511";        // To be moved later to props or context


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


	// --- Data Fetching ---
	// useCallback memoizes the function definition, preventing unneccessary re-creations
	// which can be important if passed as a prop or used in dependency arrays.
	const fetchHostSlots = useCallback(async () => {
		// Set ALL loading states true
		setIsLoadingHostSlots(true);
		setHostSlotsError(null);
		console.log("Fetching host availability...");
		try {
			const response = await fetch('/api/availability');
			if (!response.ok) throw new Error(`Hsot Availability fetch failed: ${response.status}`);
			const hostData = await response.json();
			setAvailableSlots(hostData);
			console.log("Host availability fetched:", hostData.length, "slots");
		} catch (err) {
			console.error("Error fetching host slots:", err);
			setHostSlotsError(err.message);
			setAvailableSlots([]);
		} finally {
			setIsLoadingHostSlots(false);
		}
	}, []);


	// --- useEffect ---
	useEffect(() => {
		// Load initial friend code from local storage ONCE on mount
		fetchHostSlots();

		// --- loadStorage Load Logic ---
		try {
			const storedFriendCode = localStorage.getItem('friendCode');
			console.log("Read from localStorage, storedFriendCode:", storedFriendCode);
			if (storedFriendCode) {
				// If found, update the component's state
				setInitialFriendCode(storedFriendCode); // Pre-fill the state vairable
				console.log("Set initialFriendCode state to:", storedFriendCode);
			}
		} catch (storageError) {
			console.warn("Could not read friend code from Local Storage:", storageError)
		}
		// --- End Local Storage Logic ---
		
	}, [fetchHostSlots]); // Include fetchSlots in dependency array as per linting rules with useCallback. Or potentially just [] if fetch doesn't need deps


	// --- UI Interaction Handlers ---


	// Opens Detail Modal
	const handleExpandShift = (shiftToExpand) => {
		if (!shiftToExpand) return; // Basic gaurd
		console.log("Expanding shift:", shiftToExpand.startTime);
		setDetailShiftData(shiftToExpand); // Store the whole shift object
		setIsDetailModalOpen(true); // Open the detail modal
		setBookingError(null);
	};


	// Opens Booking Modal (Called from ShiftDetailModal)
	const handleTriggerBooking = (slot) => {
		if (!slot) return;
		// --- Add Debug Log ---
		//console.log("handleTriggerBooking received slot:", slot);
		// --- End Debug Log ---
		console.log("Triggering booking modal for slot:", slot);
		setSlotDataForBooking(slot);  // Store the slot object for the modal
		setIsBookingModalOpen(true);  // Open the booking modal

		setIsDetailModalOpen (false);  // Close detail modal for cleaner flow
		setBookingError      (null);   // Clear previous booking erro
	};


	// Closes Booking Modal (Called from BookingFormModal's Cancel button/onClose)
	const handleCancelBooking = () => {
		setIsBookingModalOpen(false);  // Close the booking modal
		setBookingError      (null);   // Clear any errors shown on the modal
		setSlotDataForBooking(null);   // Clear the slot data
	};


	// Performs API Call (Called from BookingFormModal's Submit)
	const handleConfirmBooking = async({ slotId, friendCode, message }) => {
		setIsBookingLoading(true);
		setBookingError(null);
		console.log(`CONFIRMING booking for Slot ID: ${slotId}, Friend Code: ${friendCode}`);
		const bookingData = {slotId, friendCode, message};


		try {
			const response = await fetch('/api/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bookingData),
			});


			let errorMsg = `HTTP error! Status: ${response.status}`;
			if (!response.ok) {
				try {
					const errorData = await response.json();
					errorMsg = errorData.error || errorMsg;
				} catch (parseError) {
					throw new Error(errorMsg);
				}
			}

			
				const data = await response.json();
				console.log("Booking successul:", data);


				// --- Success Sequence ---
				setIsBookingModalOpen(false);                    // 1. Close the booking modal
				setLastVisitorCode   (data.visitorBookingCode);  // 2. Set data for Success Modal
				setIsSuccessModalOpen(true);                     // 3. Open the success modal


				// Save to Local Storage
				try {
					localStorage.setItem('visitorBookingCode', data.visitorBookingCode);
					localStorage.setItem('friendCode', friendCode); // Save submitted friend code
					console.log("Saved user info to Local Storage after booking.");
				} catch (storageError) {
					console.warn("Could not save user info to Local Storage:", storageError);
				}
				fetchHostSlots(); // Refresh slot list
			

		} catch (err) {
			console.error("Booking submission failed:", err);
			// Set the error state *to be displayed in the booking modal*
			setBookingError(err.message || "Booking failed. Please try again.");
			// DO NOT close booking modal on err, let user see the msg/retry
		} finally {
			setIsBookingLoading(false);
		}
	};


	// --- Debug ---
	console.log('rendering check:', {
		isLoadingHostSlots,
		isLoadingSchedule,
		hostSlotsError,
		scheduleError,
		officialScheduleExists: !!officialSchedule,
		availableSlotsLength: availableSlots.length
	});
	console.log(' --- official schedule content ---')
	console.log(officialSchedule);
	// debug
	//console.log("Rendering with currentLocale:", currentLocale);
	// --- End Debug ---
	
	return (
		<div className="bg-gray-700 p-2 rounded-lg shadow-lg w-full">
			{/* --- Top Bar: Title + Language Button --- */}
			<div className='flex flew-row justify-between items-center mb-4'>
				<h2 className='text-xl text-cyan-300'>
					{t('ui', 'mainTitle', 'Official Schedule & My Availability')}
				</h2>
				{/* Use changeLocale from the hook */}
				{/* Language Toggle Button */}
				<button
					onClick={() => changeLocale(currentLocale === 'en-US' ? 'zh-CN' : 'en-US')}
					className='text-sm bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded'
					disabled={isLoadingLocale} // Disable based on hook's loading state
					title='Switch Language'
				>
					{currentLocale === 'en-US' ? t('ui', 'switchToChinese', '中文') : t('ui', 'switchToEnglish', 'English')}
				</button>
			</div>

			
			{/* --- Loading/Error Display --- */}
			{(isLoadingHostSlots || isLoadingSchedule || isLoadingLocale) && (
				<p className='text-gray-400'>{t('ui', 'loadingSchedules', 'Loading schedules...')}</p>
			)}
			{hostSlotsError && <p className='text-red-400'>{t('ui', 'errorLoadingHost', 'Error loading Host availability:')} {hostSlotsError}</p>}
			{scheduleError && <p className='text-red-400'>{t('ui', 'errorLoadingOffical', 'Error loading official schedule:')} {scheduleError}</p>}
			{localeError && <p className='text-red-400'>{t('ui', 'errorLoadingLocale', 'Error loading language data:')} {localeError}</p>}


			{/* --- Schedule List --- */}
			{/* Render ScheduleList only when data is ready */}
			{!isLoadingHostSlots && !isLoadingSchedule && !isLoadingLocale && !hostSlotsError && !scheduleError && !localeError && officialSchedule && availableSlots && (
				<ScheduleList
					officialSchedule={officialSchedule}
					hostAvailability={availableSlots}
					t={t}
					currentLocale={currentLocale}
					checkShiftOverlap={checkShiftOverlap} 
					handleExpandShift={handleExpandShift} 
				/>
			)}
			

			{/* --- Modals --- */}
			<ShiftDetailModal
				isOpen={isDetailModalOpen}
				onClose={() => setIsDetailModalOpen(false)}
				shiftData={detailShiftData}
				hostAvailability={availableSlots}
				t={t}
				currentLocale={currentLocale}
				handleBookClick={handleTriggerBooking}
			/>


			<BookingFormModal
				isOpen={isBookingModalOpen}
				onClose={handleCancelBooking} // Use cancel handler
				slotToBook={slotDataForBooking} // Pass the specific slot data
				onSubmitBooking={handleConfirmBooking} // Pass the actual API call handler
				isLoading={isBookingLoading}
				error={bookingError}
				initialFriendCode={initialFriendCode} // Pass the state variable holding stored code
				t={t}
				currentLocale={currentLocale}
			/>


			<SuccessModal
				isOpen={isSuccessModalOpen}
				onClose={() => setIsSuccessModalOpen(false)}
				visitorCode={lastVisitorCode}
				hostContactInfo={hostContactInfo}
				t={t}
			/>
		</div>
	);
}

export default AvailabilityDisplay;