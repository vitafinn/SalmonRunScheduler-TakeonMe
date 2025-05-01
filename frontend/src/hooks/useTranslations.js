import { useState, useEffect,useCallback } from "react";


// --- Cache Configuration ---
const LOCALE_CACHE_DURATION_MINUTES = 55;
const LOCALE_CACHE_EXPIRY_MS = LOCALE_CACHE_DURATION_MINUTES * 60 * 1000;


// Function Helper to generate localStorage keys
const getLocaleCacheKey = (locale) => `localeCache_${locale}`;
const getLocaleTimestampKey = (locale) => `localeCacheTimestamp_${locale}`;
const getWeaponMapCacheKey = () => `weaponMapCache`; // Key for preproceesed map
const getWeaponMapTimestampKey = () => `weaponMapCacheTimestamp`;


// --- Fetch Helper ---
const fetchLocaleData = async (locale) => {
    // Only fetch supported locales
    if (locale !== 'zh-CN' && 
        locale !== 'en-US' && 
        locale !== 'de-DE' && // Deutsch
        locale !== 'en-GB' && // 
        locale !== 'es-ES' && // Español (ES)
        locale !== 'es-MX' && // Español (MX)
        locale !== 'fr-FR' && // Français (FR)
        locale !== 'fr-CA' && // Français (CA)
        locale !== 'it-IT' && // 
        locale !== 'ja-JP' && // 
        locale !== 'ko-KR' && // 
        locale !== 'nl-NL' && // 
        locale !== 'ru-RU' && // Русский
        locale !== 'zh-TW'    // 
    ) {
        return null; // Return null for unsupported locales
    }
    console.log(`Fetching locale data for: ${locale}`);
    try{
        const response = await fetch(`https://splatoon3.ink/data/locale/${locale}.json`);
        if (!response.ok) {
            throw new Error(`Locale (${locale}) fetch failed: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error(`Error fetching locale ${locale}:`, err);
        return null;
    }
};


// --- Custom Hook
export function useTranslations() {
    const [currentLocale, setCurrentLocale]         = useState('en-US');  // Default
    const [isLoadingLocale, setIsLoadingLocale]     = useState(false);
    const [localeError, setLocaleError]             = useState(null);
    const [weaponNameToldMap, setWeaponNameToldMap] = useState({});
    const [localeData, setLocaleData] = useState({
        'zh-CN': null, 
        'en-US': null,
        'de-DE': null,
        'en-GB': null,
        'es-ES': null,
        'es-MX': null,
        'fr-FR': null,
        'fr-CA': null,
        'it-IT': null,
        'ja-JP': null,
        'ko-KR': null,
        'nl-NL': null,
        'ru-RU': null,
        'zh-TW': null
    });

    // Effect to load locale data when currentLocale changes
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingLocale(true);
            setLocaleError(null);
            const now = Date.now(); // Get current time for comparison
            console.log("Loading all locale data...");


            // Attempt to load from Cache
            let cachedEnData = null;
            let cachedZhData = null;
            let cachedMap = null;
            let cacheValid = false; // Assume cache is invalid initially


            try{
                // Check cache timestamps first
                const enTimestamp = localStorage.getItem(getLocaleTimestampKey('en-US'));
                const zhTimestamp = localStorage.getItem(getLocaleTimestampKey('zh-CN'));
                const mapTimestamp = localStorage.getItem(getWeaponMapTimestampKey());
                console.log("CACHE CHECK: Timestamps found:", {enTimestamp, zhTimestamp, mapTimestamp}); // debug


                // Chche is valid *only* if all parts exist and are not expired
                if (enTimestamp && zhTimestamp && mapTimestamp &&
                    (now - parseInt(enTimestamp, 10) < LOCALE_CACHE_EXPIRY_MS) &&
                    (now - parseInt(zhTimestamp, 10) < LOCALE_CACHE_EXPIRY_MS) &&
                    (now - parseInt(mapTimestamp, 10) < LOCALE_CACHE_EXPIRY_MS))
                    {
                        console.log("Locale Cache: Timestamps valid. Attempting to load data...")
                        const enDataStr = localStorage.getItem(getLocaleCacheKey('en-US'));
                        const zhDataStr = localStorage.getItem(getLocaleCacheKey('zh-CN'));
                        const mapStr = localStorage.getItem(getWeaponMapCacheKey());
                        console.log("CACHE CHECK: Data strings found:", {enDataStr: !!enDataStr, zhDataStr: !!zhDataStr, mapStr: !!mapStr}); // debug
                        

                        if (enDataStr && zhDataStr && mapStr) {
                            cachedEnData = JSON.parse(enDataStr);
                            cachedZhData = JSON.parse(zhDataStr);
                            cachedMap = JSON.parse(mapStr);
                            cacheValid = true;
                            console.log("Locale Cache: Successfully loaded all data from cache.")
                        } else {
                            console.log("Locale Cache: Timestamp valid, but data missing. Cache invalid.");
                            cacheValid = false;
                        }
                } else {
                    // --- debug ---
                    // Log why timestamp check failed
                    if (!enTimestamp || !zhTimestamp || !mapTimestamp) {
                        console.log("Locale Cache: Timestamps missing. Fetching fresh data.");
                     } else {
                        console.log("Locale Cache: Cache expired. Fetching fresh data.");
                        // Optional: Log expiry times for debugging
                        console.log("Expiry Debug:", { now, enTimestamp, zhTimestamp, mapTimestamp, expiry: LOCALE_CACHE_EXPIRY_MS });
                     }
                     cacheValid = false; // Explicitly set invalid
                     // --- end debug ---
                }

            }  catch (e) {
                console.warn("Locale Cache: Error reading or parsing cache.", e);
                cacheValid = false; // Treat parsing errors as invalid cache
            }


            // --- Use Cache or Fetch New Data
            console.log("CACHE CHECK: Final cacheValid flag:", cacheValid);
            if (cacheValid && cachedEnData && cachedZhData && cachedMap) {
                // Use cached data
                setLocaleData({'en-US': cachedEnData, 'zh-CN': cachedZhData});
                setWeaponNameToldMap(cachedMap);
                setLocaleError(null); // Clear any previous error
                console.log("Locale state updated from cache.")
            } else {
                // Cache invalid or failed, fetch fresh data
                console.log("Locale Cache; Fetching fresh data from API...");
                try{
                    const [enData, zhData] = await Promise.all([
                        fetchLocaleData('en-US'),
                        fetchLocaleData('zh-CN')
                    ]);


                    if (!enData || !zhData) {
                        throw new Error ("Failed to load essential locale data during fetch.")
                    }


                    // Preprocess English data
                    const nameMap = {}
                    if (enData.weapons) {
                        for (const [id, weaponInfo] of Object.entries(enData.weapons)) {
                            if (weaponInfo?.name && !nameMap[weaponInfo.name]) {
                                nameMap[weaponInfo.name] = id;
                            }
                        }
                    }


                    // Update state
                    setWeaponNameToldMap(nameMap);
                    setLocaleData({ 'en-US': enData, 'zh-CN': zhData });
                    setLocaleError(null); // Clear error on successful fetch
                    console.log("Locale state updated from fetch.");


                    // --- Update Cache ---
                    try {
                        const currentTimeStamp = Date.now().toString();
                        localStorage.setItem(getLocaleCacheKey('en-US'), JSON.stringify(enData));
                        localStorage.setItem(getLocaleTimestampKey('en-US'), currentTimeStamp);

                        localStorage.setItem(getLocaleCacheKey('zh-CN'), JSON.stringify(zhData));
                        localStorage.setItem(getLocaleTimestampKey('zh-CN'), currentTimeStamp);

                        localStorage.setItem(getWeaponMapCacheKey(), JSON.stringify(nameMap));
                        localStorage.setItem(getWeaponMapTimestampKey(), currentTimeStamp);
                        console.log("Locale Cache: Updated with fresh data and timestamp.")
                    } catch (e) {
                        console.warn("Locale Cache: Failed to write cache.", e);
                    }
                    // --- End Update Cache ---

                    
                } catch (err) {
                    console.error("Error fetching/processing fresh locale data:", err);
                    setLocaleError(err.message);
                    // Clear potentially stale state
                    setLocaleData({'en-US': null, 'zh-CN': null});
                    setWeaponNameToldMap({});
                }
            }


            // Set loading false regardless of cache hit or fetch result
            setIsLoadingLocale(false);
            console.log("Locale loading process finished.");
        };


        loadData();
    }, []); // Run only once on mount


    // --- Translation function 't' ---
    const t = useCallback((category, key, fallbackText) => {
        let idToLookup = key; //By default, assume key is the ID 


        // --- Special handling for weapons ---
        if (category === 'weapons' && key && typeof key === 'string') {
            // If the key looks like an English name from shcedule data,
            // try to find its cryptic ID suing the preprocessed map
            const crypticId = weaponNameToldMap[key] // Use the map
            if (crypticId) {
                idToLookup = crypticId; // Use the cryptic ID for lookup
                //console.log(`Mapped weapon name '${key}' to ID '${idToLookup}'`); // debug
            } else {
                console.warn(`Could not find locale ID for weapon name: ${key}`);
                return fallbackText || key;
            }
        }
        // --- End Special Handling for weapons ---


        // debug
/*         if (currentLocale === 'zh-CN') {
            console.log("Locale data for zh-CN:", localeData?.['zh-CN']);
        } */


        // Proceed with lookup using idToLookup in the current locale
        if (currentLocale !== 'en-US' && localeData?.[currentLocale]) {
            const translation = localeData[currentLocale][category]?.[idToLookup]?.name;
            //console.log(`Lookup: localeData[${currentLocale}][${category}][${idToLookup}].name -> Result:`, translation); // Log lookup result #debug
            if (translation) {
                return translation;
            } else {
                console.warn(`Translation not found for ${category}/${idToLookup} in ${currentLocale}`);
            }
        }


        // Fallback if not translating or translation failed
        return fallbackText || `Unknown (${category} ID: ${idToLookup})`;
    }, [currentLocale, localeData, weaponNameToldMap]); // Depends on locale and its data


    // Function to change the locale
    const changeLocale = (newLocale) => {
        // Add validation if needed (e.g., only allow enus zhcn)
        setCurrentLocale(newLocale);
    };
    

    // Return everythig needed by components
    return {
        currentLocale,
        changeLocale,
        t,
        isLoadingLocale,
        localeError,
        // We might not need to expose localeData directly outside the hook
    };
}