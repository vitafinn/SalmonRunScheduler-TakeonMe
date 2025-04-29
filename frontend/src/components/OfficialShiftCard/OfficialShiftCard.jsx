import React from "react";
import {formatDateHeader, formatTime} from '../../utils/dateUtils'

function OfficialShiftCard({ shift, t, currentLocale, hasOverlap, onExpand }) {
    // Destructure shift data for easier access - with dsafe access using optional chaining!
    const startTime = shift?.startTime;
    const endTime   = shift?.endTime;
    const setting   = shift?.setting;      // Get the whole setting object first might be safe
    const stage     = setting?.coopStage;  // Get the stage object
    const weapons   = setting?.weapons;    // Get the weapons array
    const boss      = setting?.boss;       // Get the boss object (King Salmonid)


    // Basic check if essential data is missing
    if (!startTime || !endTime || !stage || !weapons) {
        console.warn("Shift data missing essential properties. Check structure:", { startTime, endTime, stage, weapons, shift });
        return <div className="p-2 text-sm text-red-400">Incomplete shift data</div>; // Render placehodler or null on error
    }


    // Format times for display
    const formattedStartTime = formatDateHeader(startTime, currentLocale);  // e.g., "9/19, 10:00AM"
    const formattedEndTime   = formatTime(endTime, currentLocale);          // e.g., "11:00AM"


    // Define base and highlight styles
    const baseCardClasses = "items-center p-3 bg-gray-800 rounded-lg border shadow-md space-x-4 transition-all duration-200";
    const highlightClasses = "border-yellow-400 border-[3px] scale-[1.02] shadow-yellow-500/50 shadow-lg cursor-pointer bg-gray-700 hover:bg-slate-600"; // Added scale, shadow, cursor, hover
    const nonHighlightClasses = "opacity-80 border-gray-700"; // Dim non-available shifts slightly


    return(
        <div
            className={`${baseCardClasses} ${hasOverlap ? highlightClasses : nonHighlightClasses}`}
            onClick={hasOverlap ? onExpand : undefined} // Call onExpand only if highlighted
        >
            <div className="flex items-center p-3 bg-gray-800 rounded-lg border border-gray-700 shadow-md space-x-4">
                {/* Stage Image and Name */}
                <div className="flex-shrink-0 w-20 h-14"> {/* Fixed size container for image */}
                    <img
                        src={stage?.image?.url}
                        alt={stage?.name || 'Stage'} // Use stage name as alt text
                        className="w-full h-full object-cover rounded" // object cover ensures image covers the area without distortion
                        onError={(e) => {e.target.style.display = 'none'; /* Hide if image fails */}}
                    />
                </div>


                {/* Middle Section: Time and Stage Name */}
                <div className="flex-grow flex-shrink basis-0 flex flex-col justify-center h-20">
                    <p className="text-sm font-semibold text-orange-300">
                        {formattedStartTime} - {formattedEndTime}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                        {stage?.name || 'Unknown Stage'}
                    </p>
                    {/* Show King Salmonid */}
                    {boss?.name &&(
                        <p className="text-xs text-gray-400 mt-1">King Salmonid: {boss.name}</p>
                    )}
                </div>


                {/* Right Section: Weapons */}
                <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Weapons</p>
                    <div className="flex space-x-1">
                        {weapons?.map((weapon, index) => (
                            <div key={`${weapon?.name || 'unknown'} - ${index}`} className="w-8 h-8 bg-gray-700 rounded p-0.5"> {/* Smaller weapon icons */}
                                <img
                                    src={weapon?.image?.url}
                                    alt={weapon?.name || `Weapon ${index + 1}`}
                                    title={weapon?.name || `Weapon ${index + 1}`} // Tooltip on hover
                                    className="w-full h-full object-contain" // object-contain keeps aspect ration
                                    onError={(e) => { e.target.src = '';/* Show placeholder or hide on error */}}
                                />
                            </div>
                        ))}
                        {/* Handle case where weapons might be unknown */}
                        {(!weapons || weapons.length === 0) && (
                            <p className="text-gray-500 text-lg">????</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


export default OfficialShiftCard