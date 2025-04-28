import { useState, useEffect,useCallback } from "react";


// Function to fetch locale data (outside the hood)
const fetchLocalData = async (locale) => {
    // Only fetch supported locales
    if (locale !== 'zh-CN') {
        return null; // Return null for unsupported locales like en-US (no file needed)
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


// The custom hook
export function useTranslations() {
    const [currentLocale, setCurrentLocale]     = useState('en-US');  // Default
    const [localData, setLocaleData]            = useState(null);     // Store ONLY the current locale's data
    const [isLoadingLocale, setIsLoadingLocale] = useState(false);
    const [localeError, setLocaleError]         = useState(null);


    // Effect to load locale data when currentLocale changes
    useEffect(() => {
        const loadData = async () => {
            if (currentLocale === 'en-US') {
                // No need to fetch for English, reset data/error
                setLocaleData(null);
                setLocaleError(null);
                setIsLoadingLocale(false);
                return;
            }


            setIsLoadingLocale(true);
            setLocaleError(null);
            const data = await fetchLocalData(currentLocale);
            if (data) {
                setLocaleData(data);
            } else {
                setLocaleError(`Failed to load data for locale: ${currentLocale}`);
                setLocaleData(null); 
            }
            setIsLoadingLocale(false);
        };


        loadData();
    }, [currentLocale]); // Re-run effect when currentLocale changes


    // The translation function 't' - memoized with useCallback
    const t = useCallback((category, id, fallbackText) => {
        // Try to translate only if data for the current (non-English) locale is loaded
        if (currentLocale !== 'en-US' && localData) {
            const translation = localData[category]?.[id]?.name;
            if (translation) {
                return translation;
            }
        }
        // Fallback to English text or ID
        return fallbackText || `Unknown (${category} ID: ${id})`;
    }, [currentLocale, localData]); // Depends on locale and its data


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