import React from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { formatDateHeader, formatTime } from '../../utils/dateUtils';
import OfficialShiftCard from '../OfficialShiftCard/OfficialShiftCard';


function shiftDetailModal({
    isOpen,                 // Boolean: Controls if modal is open
    onClose,                // Function: Called to close the modal
    shiftData,              // Object: The official shift data to display details for
    hostAvailability,       // Array: ALL of the host's available 30-min slots
    t,                      // Function: Translation helper
    currentLocale,          // String: Current language setting
    handleBookClick,        // Function: Receive handleTriggerBooking from parent
}) {
    // --- Gaurd Clause ---
    if (typeof t !== 'function') return <div>Error: Missing translation function.</div>;

    // If the modal isn't open or ther's no shift data, render nothing
    if (!isOpen || !shiftData) {
        return null;
    }


    // --- Filter Host Slots for THIS shift ---
    // Find only the host slots that fall within the displayed shift's timeframe
    const slotsForThisShift = hostAvailability.filter(hostSlot => {
        return hostSlot.start_time >= shiftData.startTime && hostSlot.start_time < shiftData.endTime;
    });


    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-40"> {/* z index lower than success modal */}
            {/* Backdrop */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/40 duration-300 ease-out data-[closed]:opacity-0"
            />


            {/* Modal Content Container */}
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-xl transform rounded-2xl bg-gray-700 p-6 text-left align-middle shadow-xl duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0" // Slightly wider max-w-xl
                >
                    {/* --- Modal Header --- */}
                    {/* Reuse the OfficialShiftCard to display the shift info consistently */}
                    <div className="mb-4">
                        <OfficialShiftCard
                            shift={shiftData}
                            t={t}
                            currentLocale={currentLocale}
                            hasOverlap={false} // No highlight needed inside modal
                            onExpand={() => {}} // No expand action needed here
                        />
                    </div>


                    {/* --- Modal Body: List of Available Host Slots --- */}
                    <DialogTitle as="h3" className="text-lg font-medium leading-6 text-cyan-300 mb-3">
                        {t('ui', 'detailModalTitle', 'Your Available Slots During This Shift:')}
                    </DialogTitle>
                    <div className="mt-2 max-h-60 overflow-y-auto pr-2 border-t border-gray-600 pt-3"> {/* Scrollable list */}
                        {slotsForThisShift.length > 0 ? (
                            <ul className="space-y-2">
                                {slotsForThisShift.map((slot) => (
                                    <li key={slot.id} className="bg-gray-600 p-3 rounded-md flex justify-between items-center shadow">
                                        <span className="text-white font-medium">
                                            {formatTime(slot.start_time, currentLocale)} - {formatTime(slot.end_time, currentLocale)}
                                        </span>
                                        <button
                                            // Call the handleBookClick passed from AvailabilityDisplay
                                            // This will set selectedSlotId *in the parent* and trigger the *parent's* booking form/modal
                                            onClick={() => {
                                                handleBookClick(slot);
                                                onClose();
                                            }}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                                        >
                                            {t('ui', 'bookButtonLabel', 'Book')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400 italic py-4 text-center">
                                {t('ui', 'detailModalNoSlots', 'No specific 30-minute slots available during this shift timeframe.')}
                            </p>
                        )}
                    </div>


                    {/* --- Modal Footer: Close Button --- */}
                    <div className="mt-5 text-right">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                            onClick={onClose}
                        >
                            {t('ui', 'closeButtonLabel', 'Close')}
                        </button>
                    </div>
                </DialogPanel>
            </div>

        </Dialog> 
        
    );
}

export default shiftDetailModal;