	// --- Helper Function formatDateHeader to return a consistent date string (e.g., "Thursday, SEptember 19, 2024")
	export const formatDateHeader = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('zh-CN', {
			weekday:'long',
			year: 'numeric',
			month:'long',
			day: 'numeric'
		}).format(date);
	};
	
	
	// --- Helper Function formatDate to return the time string (e.g., "2:30PM")
	export const formatTime = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('zh-CN', {
			hour12: true,
			hour:'numeric',
			minute: '2-digit',
		}).format(date);
	};