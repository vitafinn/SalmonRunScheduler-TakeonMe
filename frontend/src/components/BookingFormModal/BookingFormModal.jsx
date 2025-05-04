import React, { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { formatTime } from '../../utils/dateUtils'; // For displaying slot time


function BookingFormModal ({
    isOpen,              // Boolean: Controls visibility (from parent)
    onClose,             // Function: To close the modal (from parent)
    slotToBook,          // Object: Contains { id, start_time, end_time } of the slot
    onSubmitBooking,     // Function: Async handler in parent to call API (takes { friendCode, message })
    isLoading,           // Boolean: Is submission in progress? (from parent)
    error,               // String/null: Submission error message (from parent)
    initialFriendCode,   // String: Pre-filled friend code from localStorage (from parent)
    currentLocale,       // String: Controls current locale
    t                    // Function: Translation helper (from parent)
}) {
    // --- Internal State for Form Inputs ---
    const [friendCode, setFriendCode] = useState('');
    const [message, setMessage] = useState('');


    // --- Effect to Pre-fill Friend Code ---
    useEffect(() => {
        if (isOpen && initialFriendCode) {
            setFriendCode(initialFriendCode);
            console.log("Booking modal prefilled friend code:", initialFriendCode);
        }
    }, [isOpen, initialFriendCode]); // Rerun if modal opens or initial code changes


    // --- Guard Clause ---
    if (!isOpen || !slotToBook) {
        return null;
    }


    // --- Local Submit Handler ---
    const handleLocalSubmit = (event) => {
        event.preventDefault();
        // Call the actaul submission logic passed from the parent
        onSubmitBooking({
            slotId: slotToBook.id,
            friendCode,
            message
        });
    };


    // --- Debug ---
    //console.log("BookingFormModal received slotToBook:", slotToBook);


    // --- Get formatted time for display ---
    const displayTime = `${formatTime(slotToBook.start_time, currentLocale)} - ${formatTime(slotToBook.end_time, currentLocale)}`;


    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/50 duration-300 ease-out data-[closed]:opacity-0"
            />


            {/* Content */}
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-md transform rounded-2xl bg-gray-700 p-6 text-left align-middle shadow-xl duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {/* Title */}
                    < DialogTitle as="h3" className="flex-col text-3xl font-semibold text-cyan-300 mb-8">
                        {t('ui', 'bookingModalTitle', 'Confirm Booking')}
                        <span className="block text-sm font-normal text-gray-300 mt-2">
                            Slot: {displayTime} (ID: {slotToBook.id})
                        </span>
                    </DialogTitle>


                    {/* Form */}
                    <form onSubmit={handleLocalSubmit} className="space-y-4">
                        {/* Friend Code Input */}
                        <div>
                            <label htmlFor="modalFriendCode" className="block text-lg font-medium text-gray-200 mb-1">
                                {t('ui', 'friendCodeLabel', 'Your Friend Code:')} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                id="modalFriendCode"
                                value={friendCode}
                                onChange={(e) => setFriendCode(e.target.value)} // Update local state
                                required
                                className="w-full px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-white focus:outline-none focus:border-cyan-400 text-lg font-s2"
                                placeholder={t('ui', 'friendCodePlaceholder', 'SW-XXXX-XXXX-XXXX (可以只输入12位数字)')}
                            />
                        </div>
                        {/* Message Input */}
                        <div>
                            <label htmlFor="modalMessage" className="block text-lg font-medium text-gray-200 mb-1">
                                {t('ui', 'messageLabel', 'Message for me (Optional):')}
                            </label>
                            <textarea
                                id="modalMessage"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows="2"
                                className="w-full px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-white focus:outline-none focus:border-cyan-400 font-s2 text-lg"
                                placeholder={t('ui', 'messagePlaceholder', '请填写额外信息，比如联系方式，更细腻的预约时间等')}
                            />
                        </div>


                        {/* Status Display (reads props from parent) */}
                        {isLoading && <p className="text-yellow-400">{t('ui', 'bookingFormLoading', 'Submitting booking...')}</p>}
                        {error && <p className="text-red-500 bg-gray-800 p-2 rounded border border-red-600">{t('ui', 'bookingFormErrorPrefix', 'Error:')} {error}</p>}


                        {/* Action Buttons */}
                        <div className="mt-5 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                disabled={isLoading}
                            >
                                {t('ui', 'cancelButtonLabel', 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                disabled={!friendCode || isLoading}
                            >

                                {isLoading
                                ? t('ui', 'bookingButtonProgress', 'Booking...')
                                : t('ui', 'bookintButtonConfirm', 'Confirm Booking')}
                            </button>
                        </div>
                    </form>
                </DialogPanel>
            </div>
        </Dialog>
    )
}


export default BookingFormModal;