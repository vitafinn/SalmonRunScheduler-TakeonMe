// 1. Import libraries
const express = require('express'); // Import Express.js
const sqlite3 = require('sqlite3').verbose(); // Import SQLite3

// 2. Create Express app
const app = express();

// 3. Define port
const port = 3001;

// 4. Middleware to parse JSON
app.use(express.json());

// 5. Initialize SQLite database
const db = new sqlite3.Database('./salmon_run_scheduler.db', (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log('Connected to the SQLite database.');
		// --- START REPLACEMENT ---
        db.serialize(() => { // Use serialize to run commands sequentially
            // Drop tables if they exist (for easier development reset)
            // Remove or comment out these DROP lines in production or when schema is stable
			db.run(`DROP TABLE IF EXISTS bookings`, (err) => { // Drop bookings first due to potential FKs later
                if (err) console.error("Error dropping old bookings table:", err.message);
                else console.log("Old bookings table dropped (if existed).");
            });
            db.run(`DROP TABLE IF EXISTS availability_slots`, (err) => {
                 if (err) console.error("Error dropping old availability_slots table:", err.message);
                 else console.log("Old availability_slots table dropped (if existed).");
			});
			
			// Create the availability_slots table (individual 30-min slots)
			db.run(`
				CREATE TABLE IF NOT EXISTS availability_slots (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					start_time TEXT NOT NULL UNIQUE, -- ISO 8601 format UTC (e.g., '2024-07-28T14:00:00Z')
					end_time TEXT NOT NULL,   -- ISO 8601 format UTC
					is_booked BOOLEAN DEFAULT FALSE NOT NULL
					-- UNIQUE constraint on start_time ensures no duplicate slots
				)
			`, (err) => {
				if (err) {
					console.error("Error creating availability_slots table:", err.message);
				} else {
					console.log('Availability_slots table created or already exists.');
				}
			});
			db.run(`
				CREATE TABLE IF NOT EXISTS bookings(
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					visitor_booking_code TEXT NOT NULL, --The persistent 6-digit Code
					visitor_friend_code TEXT NOT NULL, --Nintendo SW code
					visitor_message TEXT, --Optional msg from visitor
					booking_start_time TEXT NOT NULL, --Start time of the *entire* booked block (ISO 8601 UTC)
					booking_end_time TEXT NOT NULL, --End time of the *entire* booked block (ISO 8601 UTC)
					booking_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL --When the booking was made -- No direct foreign key to availability_slots here, we manage the link via time ranges
				)
			`,(err)=>{
				if (err) console.error("Error creating bookings table:", err.message);
				else console.log('Bookings table created or already exists.');
			});
			
			// Create an index on visitor_friend_code for faster lookup of existing booking codes
			db.run('CREATE INDEX IF NOT EXISTS idx_visitor_friend_code ON bookings (visitor_booking_code)',(err)=>{
				if (err) console.error("Error creating index on bookings(visitor_booking_code):", err.message);
				else console.log('Index on bookings(visitor_booking_code) created or already exists.');
			});
	
		});
		
    }
});

// 6. API Endpoints

// POST /api/availability - Host creates a block of available time                                                              
app.post('/api/availability', (req, res) => {
    const { startTime, endTime} = req.body;
	
	// --- 1. Input Validation ---
    if (!startTime || !endTime) {
        return res.status(400).json({ error: "Start and end times required." });
    }
	
	// --- 2. Time Parsing & Validation ---
	// IMPORTANT ASSUMPTION: We treat the input from <input type="datetime-local">\
	//AS IF IT WERE UTC. Append 'Z' to make it explicit for the Date parser.
	// Example Input: "2024-07-29T 10:00" becomes "2024-07-29T 10:00Z"
	const startUTC = new Date(startTime + 'Z');
	const endUTC = new Date(endTime + 'Z');
	
	// Check if dates are valid 
	if (isNaN(startUTC.getTime()) || isNaN(endUTC.getTime())){
		return res.status(400).json({ error: "Invalid date format provided."});
	}
	
	//Check if end time is after start time 
	if (endUTC <=startUTC){
		return res.status(400).json({ error: "End time must be after start time."});
	}
	
	// --- 3. Generate 30-minute Slots ---
	const slotsToInsert = [];
	let currentSlotStart = new Date(startUTC);
	
	while (currentSlotStart < endUTC){
		const currentSlotEnd = new Date(currentSlotStart.getTime() + 30 * 60 * 1000);
		
		// Ensure we dont create a slot that extends beyond the requested end time 
		if (currentSlotEnd > endUTC){
			break; // Stop if the next slot would exceed the block end time 
		}
		
		// Format time as ISO 8601 UTC strings for datebase insertion
		const startISO = currentSlotStart.toISOString();
		const endISO = currentSlotEnd.toISOString();
		
		slotsToInsert.push({ start: startISO, end: endISO});
		
		// Move to the start of the next slot 
		currentSlotStart = currentSlotEnd;
	}
	
	if (slotsToInsert.length === 0){
		return res.status(400).json({ error: "No full 30-minute slots could be generated for the provided time range."});
	}
	
	// --- 4. Database Insertion (using a transaction) ---
	db.serialize(() => {
		// Begin transaction ( optional but good practice for multiple inserts)
		// db.run ("BEGIN TRANSACTION;"); //SQLite handles this implicitely with serialize often, but can be explicit
		
		const stmt = db.prepare(`
			INSERT OR IGNORE INTO availability_slots (start_time, end_time, is_booked)
			VALUES (?, ?, FALSE)
		`); // "INSERT OR IGNORE" prevents errors if a slot at the start_time already exist 
		
		let insertError = false;
		slotsToInsert.forEach(slot => {
			stmt.run(slot.start, slot.end, function(err){
				if (err){
					console.error("Error inserting slot:", slot.start, err.message);
					insertErrors - true;
				} else {
					// 'this.changes' is 1 if inserted, 0 if ignored (due to UNIQUE constraint)
					if (this.changes > 0){
						console.log(`Inserted slot: ${slot.start} - ${slot.end}`);
					} else {
						console.log(`Slot ingored (already exists?): ${slot.start}`);
					}
				}
			});
		});
		
		stml.finalize((err) => {
			if (err) {
				console.error("Error finalizing statement:", err.message);
				insertErrors = true; // Mark error if finalization fails
			}
			
			// Optional: Commit transaction 
			// db.run("COMMIT;", (commitErr) => { ... }(; // Or handle rollback on error 
			
			// --- 5. Send Response ---
			if (insertErrors){
				// ideally, you'd implement a rollback if using explicit transactions
				res.status(500).json({ error: "Failed to insert some or all availability slots. Check server logs."});
			} else {
			res.status(201).json({ message: `Successfully processed availability block. ${slotsToInsert.length} potential 30-minute slots processed.`});
			}
		});
	});
});
			
	
	
	
	
    // const code = generateCode();
    // db.run(
        // `INSERT INTO availability_slots (code, start_time, end_time, description) VALUES (?, ?, ?, ?)`,
        // [code, startTime, endTime, description],
        // function(err) {
            // if (err) {
                // console.error("Error creating slot:", err.message);
                // return res.status(500).json({ error: "Failed to create slot." });
            // }
            // res.status(201).json({ message: "Slot created!", code: code });
        // }
    // );
// );

// GET /api/availability/:code - Get slot by code
// app.get('/api/availability/:code', (req, res) => {
    // const code = req.params.code;
    // db.get(
        // `SELECT * FROM availability_slots WHERE code = ?`,
        // [code],
        // (err, row) => {
            // if (err) {
                // console.error("Error fetching slot:", err.message);
                // return res.status(500).json({ error: "Failed to fetch slot." });
            // }
            // if (row) {
                // res.json(row);
            // } else {
                // res.status(404).json({ message: "Slot not found." });
            // }
        // }
    // );
// });

// 7. Code Generation Utility Function
// function generateCode() {
    // const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // let code = '';
    // for (let i = 0; i < 6; i++) {
        // code += characters.charAt(Math.floor(Math.random() * characters.length));
    // }
    // return code;
// }

// 8. Start the server
// app.listen(port, () => {
    // console.log(`Server listening on port ${port}`);
// });