import React from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";


function SuccessModal({
    isOpen          ,   // Boolean: Controls visibility
    onClose         ,   // Function: To close the modal
    visitorCode     ,   // String: The verification id to display
    hostContactInfo ,   // String: My contact info
    t   // Function: Translation function
}) {


    if (typeof t !== 'function') return <div>Error: Missing translation function.</div>;

    // Render nothing if not open or no code provided
    if (!isOpen || !visitorCode) {
        return null;
    }


    return (
        // Use the isOpen prop to control the Dialog's open state
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* --- Backdrop --- */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/30 duration-300 ease-out data-[closed]:opacity-0"
            />


            {/* --- Modal Content Container --- */}
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel
                    transition 
                    className="w-full max-w-md transform rounded-2xl bg-gray-800 border border-green-500 p-6 text-left align-middle shadow-xl duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {/* Title */}
                    <DialogTitle
                        as="h3"
                        className="text-xl font-bold leading-6 text-green-300 text-center mb-4"
                    >
                        {t('ui', 'successModalTitle', '🎉 预约成功（还需要最后确认）🎉')}
                    </DialogTitle>


                    {/* Visitor Code */}
                    <div className="mt-2 text-center">
                        <p className="text-sm text-gray-400 mb-1">
                            
                            {t('ui', 'successModalCodeLabel', '请保管好您的数字ID（点击复制)')}
                        </p>
                        <p className="text-2xl font-mono font-bold bg-gray-900 text-white py-2 px-4 rounded-md inline-block mb-4 select-all">
                            {visitorCode} {/* Display the passed visitorCode prop */}
                        </p>
                    </div>


                    {/* Host info & Instructions */}
                    <div className="mt-4 p-3 bg-gray-700 rounded text-center text-sm border border-gray-600">
                        <p className="font-semibold mb-1 text-orange-300">
                            {t('ui', 'successModalNextStepLabel', 'Next Step: Final Confirmation')}
                        </p>
                        <p className="text-gray-300">
                            {t('ui', 'successModalInstructionsPart1', 'To finalize this session, please send your Visitor Code ({visitorCodePlaceholder}) to the host via Discord:').replace('{visitorCodePlaceholder}', visitorCode)}
                        </p>
                        <p className="mt-1">
                            {/* Display the passed hostContactInfo prop */}
                            <span className="font-mono bg-gray-900 px-2 py-1 rounded text-white">{hostContactInfo}</span>
                        </p>
                    </div>


                    {/* Clost button */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                            onClick={onClose} // Use the passed onClose prop
                        >
                            {t('ui', 'successModalCloseButton', 'Okay, Got It!')}
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}


export default SuccessModal;