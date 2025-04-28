	// --- Helper Function formatDateHeader to return a consistent date string (e.g., "Thursday, SEptember 19, 2024")
	export const formatDateHeader = (dateString, locale = 'en-US') => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat(locale, {
			weekday:'long',
			year: 'numeric',
			month:'long',
			day: 'numeric'
		}).format(date);
	};
	
	
	// --- Helper Function formatDate to return the time string (e.g., "2:30PM")
	export const formatTime = (dateString, locale = 'en-US') => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat(locale, {
			hour12: true,
			hour:'numeric',
			minute: '2-digit',
		}).format(date);
	};

	//I know our project is samll. could you still up it to normal standard in terms of structure etc. please. what are brackets for what are wrapper function fro. 