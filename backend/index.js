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
console.log("Attempting to connect to database..."); // Added log
const db = new sqlite3.Database('./salmon_run_scheduler.db', (err) => {
    if (err) {
        console.error("FATAL: Database connection error:", err.message);
        process.exit(1); // Exit if connection fails
    } else {
        console.log('Connected to the SQLite database.');

        console.log("Starting database schema setup..."); // Added log
        db.serialize(() => {
            console.log("Inside db.serialize block."); // Added log

            // Drop tables (optional for dev)
            db.run(`DROP TABLE IF EXISTS bookings`, (err) => {
                if (err) console.error("Error dropping old bookings table:", err.message);
                else console.log("Old bookings table dropped (if existed).");
            });
            db.run(`DROP TABLE IF EXISTS availability_slots`, (err) => {
                 if (err) console.error("Error dropping old availability_slots table:", err.message);
                 else console.log("Old availability_slots table dropped (if existed).");
            });

            // Create availability_slots table
            console.log("Attempting to create availability_slots table..."); // Added log
            db.run(`
                CREATE TABLE IF NOT EXISTS availability_slots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time TEXT NOT NULL UNIQUE,
                    end_time TEXT NOT NULL,
                    is_booked BOOLEAN DEFAULT FALSE NOT NULL
                )
            `, function(err) { // Use function() to access 'this' if needed, though not used here
                if (err) {
                     console.error(">>> Error creating availability_slots table:", err.message);
                } else {
                     console.log('availability_slots table creation command executed.');
                }
            });

            // Create bookings table
            console.log("Attempting to create bookings table..."); // Added log
            db.run(`
                CREATE TABLE IF NOT EXISTS bookings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_booking_code TEXT NOT NULL,
                    visitor_friend_code TEXT NOT NULL,
                    visitor_message TEXT,
                    booking_start_time TEXT NOT NULL,
                    booking_end_time TEXT NOT NULL,
                    booking_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            `, function(err) {
                if (err) {
                    console.error(">>> Error creating bookings table:", err.message);
                } else {
                    console.log('Bookings table creation command executed.');
                }
            });

            // Create index on bookings(visitor_friend_code)
            console.log("Attempting to create index idx_visitor_friend_code..."); // Added log
            db.run(`CREATE INDEX IF NOT EXISTS idx_visitor_friend_code ON bookings (visitor_friend_code)`, function(err) {
                if (err) {
                    console.error(">>> Error creating index on bookings(visitor_friend_code):", err.message);
                } else {
                    console.log('Index on bookings(visitor_friend_code) creation command executed.');
                }
            });

            // Create index on bookings(visitor_booking_code)
            console.log("Attempting to create index idx_visitor_booking_code..."); // Added log
            db.run(`CREATE INDEX IF NOT EXISTS idx_visitor_booking_code ON bookings (visitor_booking_code)`, function(err) {
                if (err) {
                    console.error(">>> Error creating index on bookings(visitor_booking_code):", err.message);
                } else {
                    // Corrected typo in log message below
                    console.log('Index on bookings(visitor_booking_code) creation command executed.');
                }
            });

            // Create index on availability_slots(start_time)
            console.log("Attempting to create index idx_slot_start_time..."); // Added log
            db.run(`CREATE INDEX IF NOT EXISTS idx_slot_start_time ON availability_slots (start_time)`, function(err) {
                if (err) {
                    console.error(">>> Error creating index on availability_slots(start_time):", err.message);
                } else {
                    console.log('Index on availability_slots(start_time) creation command executed.');
                }
            });

            console.log("Exiting db.serialize block normally."); // Added log

        }); // End of db.serialize

        console.log("Database schema setup potentially complete (async operations might still be running)."); // Added log
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
	
    // --- 4. Database Insertion ---
    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO availability_slots (start_time, end_time, is_booked)
            VALUES (?, ?, FALSE)
        `);

        // Array to keep track of errors during insertion attempts
        const insertionRunErrors = []; // Declare an array to hold errors

        slotsToInsert.forEach(slot => {
            // For each slot, run the insert statement
            stmt.run(slot.start, slot.end, function(err) { // Use function() for 'this'
                // This callback executes for each run() call
                if (err) {
                    // If this specific insertion failed, log it and record the error
                    console.error("Error inserting slot:", slot.start, err.message);
                    insertionRunErrors.push({ slot: slot.start, message: err.message });
                } else {
                    // Log success or ignore status
                    if (this.changes > 0) {
                         console.log(`Inserted slot: ${slot.start} - ${slot.end}`);
                    } else {
                         console.log(`Slot ignored (already exists?): ${slot.start}`);
                    }
                }
            });
        });

        // Finalize the prepared statement
        // The callback here executes *after* all the stmt.run() calls initiated above
        // have completed AND the statement itself is finalized.
        stmt.finalize((finalizeErr) => {
            // --- 5. Send Response ---
            // This code block now reliably runs after everything else

            // First, check if finalization itself failed
            if (finalizeErr) {
                console.error("Error finalizing statement:", finalizeErr.message);
                // If finalization fails, that's a critical server error
                // We use 'return' to ensure no other response is sent
                return res.status(500).json({ error: "Failed to finalize database operation. Check server logs." });
            }

            // Next, check if any errors were collected during the stmt.run() calls
            if (insertionRunErrors.length > 0) {
                 // If there were insertion errors, report a failure
                 console.log(`Finalizing with ${insertionRunErrors.length} insertion errors recorded.`);
                 // Use 'return' to ensure no other response is sent
                 return res.status(500).json({
                     error: `Failed to insert ${insertionRunErrors.length} slot(s) due to errors or conflicts. Check server logs.`,
                     // You could optionally send details: details: insertionRunErrors
                 });
            }

            // If we reach this point, it means:
            // 1. Finalization succeeded (no finalizeErr)
            // 2. No errors occurred during any stmt.run() call (insertionRunErrors is empty)
            console.log("Finalizing successfully with no insertion errors.");
            res.status(201).json({
                 message: `Successfully processed availability block. ${slotsToInsert.length} potential 30-minute slots processed.`
             });

        }); // End of stmt.finalize callback

    }); // End of db.serialize block
});

//GET /api/availability - Get all *available* (not booked) slots
app.get('/api/availability', (req, res) => {
	console.log("Received request for GET /api/availability"); //Log request
	
	// Query the database for all slots where is_booked is FALSE
	// Order by start_time to ensure they are chronologically sorted
	db.all(
	`SELECT id, start_time, end_time
	FROM availability_slots
	WHERE is_booked = FALSE
	ORDER BY start_time ASC`,
	[], // No params needed for this query
	(err, rows) => {
		if (err){
			// Log the rror and send a generic server error response 
			console.error("Error fetching available slots:", err.message);
			res.status(500).json({ error: "Failed to fetch availability slots."});
		} else {
			// if successful, log the number of slots found and send the data
			console.log(`Found ${rows.length} available slots.`);
			// Sned the array of availlable slots as JSON 
			// Each row will be an object like: { id: 1, start_time: '...', end_time: '...'}
			res.status(200).json(rows);
		}
	});
});


// POST /api/bookings - Visitor books a specific 30-min slot
app.post('/api/bookings', (req, res) => {
	const { slotId, friendCode, message} = req.body;
	console.log(`Received booking request: FriendCode ${friendCode} for Slot ID ${slotId}`);
	
	
	// --- 1. Input Validation ---
	if (slotId === undefined || slotId === null || !friendCode){ // More robust check for slotId
		return res.status(400).json({ error: "Invalid Slot ID provided (must be a positive number)."});
	}
	
	
	// Parse slotId to a number and validate it 
	const slotIdNum = parseInt(slotId, 10);
	if (isNaN(slotIdNum) || slotIdNum <=0){
		return res.status(400).json({ error: "Invalid Slot ID provided (must be a positive number)."});
	}
	
	
	// --- 2. Database Operations (Transaction needed) ---
	db.serialize(() => {
		db.run("BEGIN TRANSACTION;");
		
		let bookedSlotStartTime; // Variable to store slot times for booking record 
		let bookedSlotEndTime;
		
		
		// --- Step 2a: Check Slot Availability and Get Deatails ---
		const checkSlotSql =`
			SELECT start_time, end_time, is_booked
			FROM availability_slots
			WHERE id = ?
		`;
		db.get(checkSlotSql, [slotIdNum], (err, slot) => {
			if (err){
				console.error(`Error checking slot ${slotIdNum} availability:`, err.message);
				db.run("ROLLBACK;");
				return res.status(500).json({ error: "Database error checking slot availability."});
			}
			
			if(!slot){
				//Slot ID does not exist
				console.warn(`Booking attempt failed: Slot ID ${slotIdNum} not found.`);
				db.run("ROLLBACK;");
				return res.status(404).json({ error: `Availability slot with ID ${slotIdNum} not found.`});
			}
			
			if(slot.is_booked){
				// Slot is already booked
				console.warn(`Booking attempt failed: Slot ID ${slotIdNum} is already booked.`);
				db.run("ROLLBACK;");
				return res.status(409).json({ 
				error: `Sorry, the time slot (ID ${slotIdNum}) is no longer available.`
				});
			}				
			
			//Slot exists and is available! Store its times.
			bookedSlotStartTime = slot.start_time;
			bookedSlotEndTime = slot.end_time;
			console.log(`Slot ${slotIdNum} (${bookedSlotStartTime} - ${bookedSlotEndTime}) is available for booking.`);
			
			
			// --- Step 2b: Find or Generate Visitor Booking Code ---
			const findVisitorSql = `SELECT visitor_booking_code FROM bookings WHERE visitor_friend_code = ? LIMIT 1`;
			db.get(findVisitorSql, [friendCode], (err, visitor) => {
				if (err){
					console.error(`Error finding existing visitor code for ${friendCode}:`, err.message);
					db.run("ROLLBACK;");
					return res.status(500).json({ error: "Database error checking visitor history."});
				}
				let visitorBookingCode;
				if (visitor){
					visitorBookingCode = visitor.visitor_booking_code;
					console.log(`Found existing visitor code for ${friendCode}: ${visitorBookingCode}`);
					// Proceed directly to booking updates
					performBookingUpdates(visitorBookingCode, slotIdNum, bookedSlotStartTime, bookedSlotEndTime);
				} else {
					// Generate a NEW unique 6-digit code (with basic collision handling)
					console.log(`NO existing code found for ${friendCode}, generating new one...`);
				const generateUniqueCode = (attempt = 1) => {
					const newCode = generateCode();// Use your existing function 
					const checkCodeSql = `SELECT id FROM bookings WHERE visitor_booking_code = ? LIMIT 1`;
					db.get(checkCodeSql, [newCode], (err, existingCode) => {
						if (err){
							console.error("Error checking new code uniqueness:", err.message);
							db.run("ROLLBACK;", rbErr => { if(rbErr) console.error("Rollback failed on code check error", rbErr)});
							// Exit early - can't safely proceed 
							return res.status(500).json({ error: "Database error checking code uniqueness."});
						}
						if (existingCode && attempt < 5){ //Collision! Retry.
							console.warn(`Generated code ${newCode} collision (attempt ${attempt}), retrying...`);
							setTimeout(() => generateUniqueCode(attempt + 1), 50); // Add small delay before retry 
						} else if (existingCode) { // Max retries failed 
							console.error(`Failed to generate unique visitor code for ${friendCode} after ${attempt}.`);
							ab.run("ROLLBACK;", rbErr => { if(rbErr) console.error("Rollback failed on max code attempts", rbErr)});
							return res.status(500).json({ error: "Failed to generate unique visitor code. Please try again."});
						} else { // Code is unique 
							visitorBookingCode = newCode;
							console.log(`Generated new visitor code for ${friendCode}: ${visitorBookingCode}`);
							// Proceed with booking using the new code 
							performBookingUpdates(visitorBookingCode, slotIdNum, bookedSlotStartTime, bookedSlotEndTime);
						}
					});
				};
				generateUniqueCode(); // Start generation process
				// IMPORTANT: We don't return from this outer callback; performBookingUpdates is called *inside* generateUniqueCode's success path.
				}
			}); // End findVisitorSql db.get 
			
			
			// --- Helper function to perform DB updates ---
			const performBookingUpdates = (codeToUse, currentSlotId, slotStartTime, slotEndTime) => {
				console.log(`Attempting to book slot ${currentSlotId} for visitor ${codeToUse}`);
				// --- Step2c: Update availability_slots ---
				const updateSlotSql = `
					UPDATE availability_slots
					SET is_booked = TRUE 
					WHERE id = ? AND is_booked = FALSE
				`;// Add 'AND is_booked = FALSE' for extra safety against race conditions
				
				
				db.run(updateSlotSql, [currentSlotId], function(err){ // Use function for 'this'
					if (err) {
						console.error(`Error updating availability slot ${currentSlotId}:`, err.message);
						db.run("ROLLBACK;");
						return res.status(500).json({ error: "Database error updating slot status." });
					}
					
					
					// Check if exactly one row was updated 
					if (this.changes !== 1){
						console.warn(`Concurrency issue or slot already booked? Update affected ${this.changes} rows for slot ${currentSlotId}. Rolling back.`);
						db.run("ROLLBACK;");
						// 409 Conflict is appropriate here as the slot state likely changed
						return res.status(409).json({ error: "Booking conflict detected during update. The slot may have just been booked by someone else. Please try again."});
					}
					console.log(`Successfully marked slot ${currentSlotId} as booked.`);
					
					
					// --- Step 2d: Insert into bookings table ---
					const insertBookingSql = `
						INSERT INTO bookings (visitor_booking_code, visitor_friend_code, visitor_message, booking_start_time, booking_end_time)
						VALUES (?, ?, ?, ?, ?)
					`;
					db.run(insertBookingSql, [codeToUse, friendCode, message || null, slotStartTime, slotEndTime], function(err){ // Use function for 'this'
						if (err) {
							console.error(`Error inserting booking record for visitor ${codeToUse}, slot ${currentSlotId}:`, err.message);
							db.run("ROLLBACK;");
							return res.status(500).json({ error: "Database error creating booking record." });
						}
						const bookingId = this.lastID;
						console.log(`Successfully inserted booking record ID: ${bookingId} for visitor ${codeToUse}`);
						
						
						// --- Step 2e: Commit Transaction ---
						db.run("COMMIT;", (commitErr) => {
							if (commitErr){
								console.error("Error commiting transaction:", commitErr.message);
								// Rollback might have already happened implicitly? Try anyway.
								db.run("ROLLBACK;", rbErr => { if(rbErr) console.error("Rollback failed on commit error", rbErr)});
								return res.status(500).json({ error: "Database error finalizing booking." });
							}
							
							
							console.log(`Booking successul for ${friendCode} (${codeToUse}), slot ${currentSlotId}.`);
							// --- Step 3: Send Response ---
							res.status(201).json({
								message: "Booking successful!",
								visitorBookingCode: codeToUse
							});
						}); // End Commit 
					}); // End Inser Booking
				}); // End Update Slot 
			}; // End performBookingUpdates function definition
		}); // End checkSlotSql db.get 
	}); // End db.serialize (Transaction)
});


// --- REMINDER: Ensure your generateCode() function is present below ---
function generateCode(){
	const characters = '0123456789';
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return code;
}


// Add this block *before* app.listen to catch errors globally
process.on('uncaughtException', (err, origin) => {
  console.error('<<<<< UNCAUGHT EXCEPTION >>>>>');
  console.error('Origin:', origin);
  console.error(err);
  process.exit(1); // Exit after logging uncaught exception
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('<<<<< UNHANDLED PROMISE REJECTION >>>>>');
  console.error('Reason:', reason);
  // console.error('Promise:', promise); // Can be verbose
  process.exit(1); // Exit after logging unhandled rejection
});

// 7. Start the server
console.log("Attempting to start server..."); // Added log
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

console.log("Script execution reached end (server might be starting asynchronously)."); // Added log