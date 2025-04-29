import { useState, useEffect,useCallback } from "react";


// --- Fetch Helper ---
const fetchAllLocaleData = async (locale) => {
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
            console.log("Loading all locale data...");


            try{
                // Fetch both languages concurrently
                const [enData, zhData] = await Promise.all([
                    fetchLocaleData('en-US'),
                    fetchlocaleData('zh-CN')
                ]);


                if (!enData || !zhData) {
                    throw new Error ("Failed to load essential locale data.")
                }


                // --- Preprocess English data to create Name -> ID map ---
                const nameMap = {};
                if (enData.weapons) {
                    for (const [id, weaponInfo] of Object.entries(enData.weapons)) {
                        if (weaponInfo && weaponInfo.name) {
                            // Handle potential duplicate names? for now, first wins.
                            if (!nameMap[weaponInfo.name]) {
                                nameMap[weaponInfo.name] = id;
                            }
                        }
                    }
                }
                setWeaponNameToldMap(nameMap);
                console.log("Weapon Name -> ID map created.");
                // --- End Processing ---


                // Store both locale data objects
                setLocaleData({
                    'en-US': enData,
                    'zh-CN': zhData
                });
                console.log("All locale data stored.");
            } catch (err) {
                setLocaleError(err.message);
                setLocaleData({ 'en-US': null, 'zh-CN': null}); // Clear data on error
                setWeaponNameToldMap({});
            } finally {
                setIsLoadingLocale(false);
            }
        };


        fetchAllLocaleData();
    }, []); // Re-run effect when currentLocale changes


    // --- Translation function 't' ---
    const t = useCallback((category, id, fallbackText) => {
        let idToLookup = KeyboardEvent; //By default, assume key is the ID 


        // --- Special handling for weapons ---
        if (category === 'weapons' && key && typeof key === 'string') {
            // If the key looks like an English name from shcedule data,
            // try to find its cryptic ID suing the preprocessed map
            const crypticId = weaponNameToldMap[key] // Use the map
            if (crypticId) {
                idToLookup = crypticId; // Use the cryptic ID for lookup
                console.log(`Mapped weapon name '${key}' to ID '${idToLookup}'`);
            } else {
                console.warn(`Could not find locale ID for weapon name: ${key}`);
                return fallbackText || key;
            }
        }
        // --- End Special Handling for weapons ---


        // Proceed with lookup using idToLookup in the current locale
        if (currentLocale !== 'en-US' && localeData?.[currentLocale]) {
            const translation = localeData[currentLocale][category]?.[idToLookup]?.name;
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