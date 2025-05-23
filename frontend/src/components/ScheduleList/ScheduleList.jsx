import React from "react";
import OfficialShiftCard from '../OfficialShiftCard/OfficialShiftCard';


// Receives the schedule data, host slots, handlers, and translation utils
function ScheduleList({
    officialSchedule,
    hostAvailability,
    t,
    currentLocale,
    checkShiftOverlap, // Receive the overlap checking function
    handleExpandShift // Receive the handler to call when a card is clicked
}) {
    

    // Helper function to render a section
    const renderShiftSection = (titleKey, defaultTitle, shifts, titleColor = 'text-orange-300') => {
        // Check if shifts exist and have nodes
        if (!shifts?.nodes || shifts.nodes.length === 0) {
            return null; // Don't render anything if no shifts in this node
        }


        return (
            <div>
                <h3 className={`text-base ${titleColor} mb-3`}>
                    {t('ui', titleKey, defaultTitle)}
                </h3>
                <div className="space-y-4">
                    {shifts.nodes.map(shift => {
                        // Calculate overlap for this specific shift
                        const hasOverlap = checkShiftOverlap(shift.startTime, shift.endTime, hostAvailability);


                        return (
                            <OfficialShiftCard
                                key={shift.startTime}
                                shift={shift}
                                t={t}
                                currentLocale={currentLocale}
                                hasOverlap={hasOverlap}
                                // Call the passed handler, providing hte specific shift clicked
                                onExpand={() => handleExpandShift(shift)}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };


    //Check if there are any shifts at all to display
    const hasAnyShifts =
    officialSchedule.regularSchedules?.nodes?.length > 0 ||
    officialSchedule.bigRunschedules?.nodes?.length > 0 ||
    officialSchedule.teamContestSchedules?.nodes?.length > 0;


    return (
        <div className="space-y-6">
            {/* Render each section using the helper */}
            {renderShiftSection('upcomingShiftsTitle', 'Upcoming Shifts', officialSchedule.regularSchedules, 'text-[#c44b21]')}
            {renderShiftSection('bigRunActiveTitle', 'Big run Active!', officialSchedule.bigRunSchedules, 'text-red-400')}
            {renderShiftSection('teamContestTitle', 'Team Contest', officialSchedule.teamContestSchedules, 'text-[#dda024]')}


            {/* Message if no shifts were found in any section (unlikely) */}
            {!hasAnyShifts && (
                <p className="text-gray-400">
                    {t('ui', 'noSchedulesFound', 'No upcoming Salmon Run schedules found in the Ink api data')}
                </p>
            )}
        </div>
    )
}


export default ScheduleList;