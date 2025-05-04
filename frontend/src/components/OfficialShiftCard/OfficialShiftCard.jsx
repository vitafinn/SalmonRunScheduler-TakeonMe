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
    const cardBase = "p-2 bg-gray-800 rounded-lg border shadow-md transition-all duration-200 space-y-3 ";
    const highlightEffect = hasOverlap
        ? "border-[#098264] border-[6px] scale-[1.01] md:scale-[1.02] shadow-lg shadow-green-900/50 cursor-pointer hover:bg-[#c44b21]" // Orange BG on hover *only* if highlighted
        : "border-gray-700 opacity-60"; // Dimmed and plain border if no overlap


    return(
        <div
            className={`${cardBase} ${highlightEffect} font-s2 flex space-x-3 items-center`}
            onClick={hasOverlap ? onExpand : undefined} // Call onExpand only if highlighted
        >
            
            {/* Stage Image and Name */}
            <div className=""> {/* Fixed size container for image */}

                <img
                    src={stage?.image?.url}
                    alt={stage?.name || 'Stage'} // Use stage name as alt text
                    className="block  object-cover  rounded m-1" // object cover ensures image covers the area without distortion max-w-[100px] max-h-[200]
                    onError={(e) => {e.target.style.display = 'none'; /* Hide if image fails */}}
                />
            </div>


            {/* Middle Section: Time and Stage Name */}
            <div className="flex-grow flex-shrink basis-0 flex flex-col justify-center items-center">
                <p className="text-xs text-orange-300">
                    {formattedStartTime} - {formattedEndTime}
                </p>
                <p className="text-base leading-relaxed text-sr-text-light text-white mt-1">
                    {t('stages', stage?.id, stage?.name) || 'Unknown Stage'}
                </p>
                {/* Show King Salmonid */}
                {boss?.name &&(
                    <p className="text-xs text-gray-400 mt-1">
                        {('ui', 'kingSalmonid', 'King Salmonid:')} {t('bosses', boss?.id, boss?.name) || boss?.name}
                    </p>
                )}
            </div>


            {/* Right Section: Weapons */}
            <div className="flex flex-col items-center space-y-1 min-w-0">
                <p className="text-xs md:text-base text-gray-400 mb-1 ">{t('ui', 'weaponsLabel', 'Weapons')}</p>
                <div className="flex-col sm:flex sm:flex-row space-x-1 space-y-1">
                    {weapons?.map((weapon, index) => {
                    /* // --- temp debug log ---
                        console.log(`Rendering weapon from SCHEDULE: Name='${weapon?.name}', ID='${weapon?.__splatoon3ink_id || 'N/A'}'`);
                        // --- Eng debug log --- */
                        return (
                            <div key={`${weapon?.name || 'unknown'}-${index}`} className="w-8 h-8 bg-gray-700 rounded p-0.5"> {/* Smaller weapon icons */}
                                <img
                                    src={weapon?.image?.url}
                                    alt={t('weapons', weapon?.name, weapon?.name) || `Weapon ${index + 1}`}
                                    title={t('weapons', weapon?.name, weapon?.name) || `Weapon ${index + 1}`} // Tooltip on hover
                                    //alt={weapon?.name || `Weapon ${index + 1}`}
                                    //title={weapon?.name || `Weapon ${index + 1}`} // debug
                                    className="w-full h-full object-contain" // object-contain keeps aspect ratio
                                    onError={(e) => { e.target.src = '';}}
                                />
                            </div>
                        );
                    })}
                    {/* Handle case where weapons might be unknown */}
                    {(!weapons || weapons.length === 0) && (
                        <p className="text-gray-500 text-lg">????</p>
                    )}
                </div>
            </div>
        </div>
    );
}


export default OfficialShiftCard