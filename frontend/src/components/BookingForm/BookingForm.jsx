import React from "react";


function BookingForm({
    slotId,             // Number: The ID of the slot being booked (for display)
    friendCode,         // String: Current value for friend code input
    onFriendCodeChange, // Function: Handler for when friend code input changes
    message,            // String: Current value for message input
    onMessageChange,    // Function: Handler for when message input changes
    onSubmit,           // Function: Handler for when the form is submitted
    onCancel,           // Function: Handler for when the cancel button is clicked
    isLoading,          // Boolean: Is the submission in progress?
    t,                  // Function: translation function
    error               // String/null: Any error message to display
}) {
    // This component ONLY renders the form structure and calls parent handlers.
    // It doesn't manage its own submission state beyond what's passed in isLoading/error.


    // Add a basic check for the t function
    if (typeof t !== 'function') {
        console.error("BookingForm requires the 't' function prop.");
        return <div>Error: Translation function not provided.</div>;
    }


    return (
        <div className="mt-6 p-4 bg-gray-600 rounded-lg border border-cyan-500">
            {/* --- Title --- */}
            <h3 className="text-xl font-semibold mb-3 text-cyan-300">
                {t('ui', 'bookingFormTitle', 'Book Slot ID:')} {slotId} 
            </h3>
            {/* --- Friend Code Input --- */}
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label htmlFor="friendCode" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('ui', 'friendCodeLabel', 'Your Friend Code:')} <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        id="friendCode"
                        value={friendCode} // Controlled by parent state via prop
                        onChange={onFriendCodeChange} // Call parent handler on change
                        required
                        className="w-full px-3 py-2 rounded-md bg-gray-500 border border-gray-400 text-white focus:outline-none focus:border-cyan-400"
                        placeholder={t('ui', 'friendCodePlaceholder', 'SW-XXXX-XXXX-XXXX (可以只输入12位数字)')}
                    />
                </div>
                {/* --- Message Input --- */}
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('ui', 'messageLabel', 'Message for me (Optional):')}
                    </label>
                    <textarea
                        id="message"
                        value={message} // Controlled by parent state via prop
                        onChange={onMessageChange} // Call parent handler onchange
                        rows="2"
                        className="w-full px-3 py-2 rounded-md bg-gray-500 border border-gray-400 text-white focus:outline-none focus:border-cyan-400"
                        placeholder={t('ui', 'messagePlaceholder', '请填写额外信息，比如联系方式，更细腻的预约时间等')}
                    />
                </div>


                {/* --- Status Display --- */}
                {isLoading && <p className="text-yellow-400">{t('ui', 'bookingFormLoading', 'Submitting booking...')}</p>}
                {error && <p className="text-red-400">{t('ui', 'bookingFormErrorPrefix', 'Error:')} {error}</p>}


                {/* --- Buttons --- */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel} // Call parent cancel handler
                        className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={isLoading}
                    >
                         {t('ui', 'cancelButtonLabel', 'Cancel')}
                    </button>
                    <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                        disabled={!friendCode || isLoading} // Disable based on props
                    >
                        {isLoading 
                        ? t('ui', 'bookingButtonProgress', 'Booking...')
                        : t('ui', 'bookingButtonConfirm', 'Confirm Booking')}
                    </button>
                </div>
            </form>
        </div>
    )
}


export default BookingForm;