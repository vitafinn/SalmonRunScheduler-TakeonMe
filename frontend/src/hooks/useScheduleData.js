import { useState, useEffect, useCallback } from "react";


// --- Cache Configuration --- 
const SCHEDULE_CACHE_DURATION_MINUTES = 55;
const SCHEDULE_CACHE_EXPIRY_MS = SCHEDULE_CACHE_DURATION_MINUTES * 60 * 1000;
const SCHEDULE_CACHE_KEY = 'scheduleCache';
const SCHEDULE_TIMESTAMP_KEY = 'scheduleCacheTimestamp';


// --- Custom Hook ---
export function useScheduleData() {
    // State
    const [officialSchedule, setOfficialSchedule] = useState(null); // CoopGroupingSchedule object
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [scheduleError, setScheduleError] = useState(null);


    // Function to fetch schedule data (defined once using useCallback)
    const fetchSchedule = useCallback(async () => {
        console.log("fetchSchedule started...");
        setIsLoadingSchedule(true);
        setScheduleError(null);
        const now = Date.now();


        // --- 1. Try loading from Cache ---
        let cachedData = null;
        let cacheIsValid = false;
        try {
            const timestampStr = localStorage.getItem(SCHEDULE_TIMESTAMP_KEY);
            if (timestampStr && (now - parseInt(timestampStr, 10) < SCHEDULE_CACHE_EXPIRY_MS)) {
                console.log("Schedule Cache: Timestamp valid. Attempting load.");
                const dataStr = localStorage.getItem(SCHEDULE_CACHE_KEY);
                if (dataStr) {
                    cachedData = JSON.parse(dataStr);
                    // Basic validation, check if the expected structure exists
                    if (cachedData?.regularSchedules) {
                        cacheIsValid = true;
                        console.log("Schedule Cache: Successfully loaded from cache.");
                    } else {
                        console.warn("Schedule Cache: Parsed data invalid structure. Invalidating.");
                        localStorage.removeItem(SCHEDULE_CACHE_KEY);
                        localStorage.removeItem(SCHEDULE_TIMESTAMP_KEY);
                    }
                } else {
                    console.log("Schedule Cache: Timestamp valid, data missing. Invalidating.");
                    localStorage.removeItem(SCHEDULE_TIMESTAMP_KEY); // Remove stale timestamp
                }
            } else {
                if(timestampStr) console.log("Schedule Cache: Expired.");
                else console.log("Schedule Cache: Timestamp missing.");
            }
        } catch (e) {
            console.warn("Schedule Cache: Error reading or parsing cache.", e);
            cacheIsValid = false;
        }


        // --- 2. Use Cache or Fetch New
        if (cacheIsValid && cachedData) {
            setOfficialSchedule(cachedData);
            console.log("Schedule state updated from cache.");
        } else {
            console.log("Schedule Cache: Fetching fresh data from API...");
            try {
                const response = await fetch('https://splatoon3.ink/data/schedules.json');
                if (!response.ok) {
                    throw new Error(`Official Schedule fetch failed: ${response.status}`);
                }
                const fullApiData = await response.json();


                // Extract only the SR part
                if (fullApiData.data?.coopGroupingSchedule) {
                    const scheduleDataToCache = fullApiData.data.coopGroupingSchedule;
                    setOfficialSchedule(scheduleDataToCache); // Update state
                    console.log("Schedule state updated from fetch.");


                    // --- Update Cache ---
                    try{
                        localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(scheduleDataToCache));
                        localStorage.setItem(SCHEDULE_TIMESTAMP_KEY, Date.now().toString());
                        console.log("Schedule Cache: Updated with fresh data and timestamp.");
                    } catch (e) {
                        console.warn("Schedule Cache: Failed to write cache.", e);
                    }
                    // --- End Update Cache ---
                } else {
                    throw new Error("Could not find SR schedule in official data.");
                }
            } catch (err) {
                console.error("Error fetching/processing fresh schedule data:", err);
                setScheduleError(err.message);
                setOfficialSchedule(null); // Clear potentially stale data
            }
        }


        // Set loading false regarless of cache/fetch outcome
        setIsLoadingSchedule(false);
        console.log("Schedule loading finished.");
    }, []);


    // Effect to run the fetch function on mount
    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);


    // Return the state values needed by the component
    return {
        officialSchedule,
        isLoadingSchedule,
        scheduleError
    };
}