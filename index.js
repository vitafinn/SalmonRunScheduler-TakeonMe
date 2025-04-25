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

// POST /api/bookings - Visitor books a time range
app.post('/api/bookings', (req, res) => {
    const { bookingStartTime, bookingEndTime, friendCode, message } = req.body;
    console.log(`Received booking request: ${friendCode} for ${bookingStartTime} to ${bookingEndTime}`);

    // --- 1. Input Validation ---
    if (!bookingStartTime || !bookingEndTime || !friendCode) {
        return res.status(400).json({ error: "Booking start time, end time, and friend code are required." });
    }

    // --- 2. Time Parsing & Validation ---
    // Treat input as UTC (append Z)
    const startUTC = new Date(bookingStartTime + 'Z');
    const endUTC = new Date(bookingEndTime + 'Z');

    if (isNaN(startUTC.getTime()) || isNaN(endUTC.getTime())) {
        return res.status(400).json({ error: "Invalid date format provided for booking." });
    }
    if (endUTC <= startUTC) {
        return res.status(400).json({ error: "Booking end time must be after start time." });
    }

    // Convert to ISO strings for database querying
    const startISO = startUTC.toISOString();
    const endISO = endUTC.toISOString();

    // --- 3. Database Operations (Transaction needed) ---
    db.serialize(() => {
        // Explicitly begin transaction
        db.run("BEGIN TRANSACTION;");

        // --- Step 3a: Check Availability of ALL slots in the range ---
        const checkAvailabilitySql = `
            SELECT id, start_time
            FROM availability_slots
            WHERE start_time >= ? AND start_time < ? AND is_booked = TRUE
        `;
        // Find any slot within the range that is already booked.
        // We use >= start and < end because slots represent intervals.
        // A booking from 10:00 to 11:00 includes the 10:00 and 10:30 slots.
        // The start_time of the 11:00 slot would be >= 11:00, so '< endISO' is correct.

        db.get(checkAvailabilitySql, [startISO, endISO], (err, bookedSlot) => {
            if (err) {
                console.error("Error checking slot availability:", err.message);
                db.run("ROLLBACK;"); // Rollback on error
                return res.status(500).json({ error: "Database error checking availability." });
            }

            if (bookedSlot) {
                // If ANY booked slot is found in the range, the request fails
                console.warn(`Booking conflict found for ${friendCode}. Slot starting at ${bookedSlot.start_time} is booked.`);
                db.run("ROLLBACK;");
                return res.status(409).json({ // 409 Conflict status code
                    error: `Time slot conflict. At least part of the requested time (${startISO} to ${endISO}) is already booked.`
                });
            }

             // If no booked slots are found, proceed to check if *all* necessary slots exist & mark them
            const slotsToBookSql = `
                SELECT id FROM availability_slots
                WHERE start_time >= ? AND start_time < ? AND is_booked = FALSE
            `;
             db.all(slotsToBookSql, [startISO, endISO], (err, availableSlots) => {
                if (err) {
                    console.error("Error fetching slots to book:", err.message);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: "Database error fetching slots to book." });
                }

                // Validate if the number of found slots matches the expected number for the range
                const expectedDurationMinutes = (endUTC.getTime() - startUTC.getTime()) / (60 * 1000);
                const expectedSlotCount = expectedDurationMinutes / 30;

                if (availableSlots.length !== expectedSlotCount) {
                     console.warn(`Booking availability mismatch for ${friendCode}. Expected ${expectedSlotCount} slots, found ${availableSlots.length} available slots in range ${startISO} to ${endISO}.`);
                     db.run("ROLLBACK;");
                     return res.status(404).json({ // 404 Not Found (or 400 Bad Request)
                         error: `The requested time range (${startISO} to ${endISO}) is not fully available or doesn't align with existing 30-min slots.`
                     });
                }

                // If count matches, all slots exist and are available. Proceed!
                const slotIdsToBook = availableSlots.map(slot => slot.id);
                console.log(`Found ${slotIdsToBook.length} slots to book for ${friendCode}: IDs ${slotIdsToBook.join(', ')}`);

                // --- Step 3b: Find or Generate Visitor Booking Code ---
                const findVisitorSql = `SELECT visitor_booking_code FROM bookings WHERE visitor_friend_code = ? LIMIT 1`;
                db.get(findVisitorSql, [friendCode], (err, visitor) => {
                    if (err) {
                        console.error("Error finding existing visitor code:", err.message);
                        db.run("ROLLBACK;");
                        return res.status(500).json({ error: "Database error checking visitor history." });
                    }

                    let visitorBookingCode;
                    if (visitor) {
                        visitorBookingCode = visitor.visitor_booking_code;
                        console.log(`Found existing visitor code for ${friendCode}: ${visitorBookingCode}`);
                    } else {
                        // Generate a NEW unique 6-digit code
                        // NOTE: In a high-traffic app, this generation needs collision handling.
                        // For this small app, simple random generation is likely okay, but we add a retry just in case.
                        const generateUniqueCode = (attempt = 1) => {
                            const newCode = generateCode(); // Reuse your existing function
                            const checkCodeSql = `SELECT id FROM bookings WHERE visitor_booking_code = ? LIMIT 1`;
                            db.get(checkCodeSql, [newCode], (err, existingCode) => {
                                if (err) {
                                    console.error("Error checking new code uniqueness:", err.message);
                                    db.run("ROLLBACK;");
                                    res.status(500).json({ error: "Database error checking code uniqueness." });
                                    // Note: Cannot return directly from nested callback easily, error handling gets complex.
                                    // Proper async/await or promises would handle this better.
                                    // For now, we rely on the transaction rollback.
                                    return;
                                }
                                if (existingCode && attempt < 5) { // Collision! Retry up to 5 times.
                                    console.warn(`Generated code ${newCode} collision, retrying...`);
                                    generateUniqueCode(attempt + 1);
                                } else if (existingCode) { // Max retries failed
                                     console.error(`Failed to generate unique visitor code for ${friendCode} after ${attempt} attempts.`);
                                     db.run("ROLLBACK;");
                                     res.status(500).json({ error: "Failed to generate unique visitor code. Please try again." });
                                } else { // Code is unique!
                                    visitorBookingCode = newCode;
                                    console.log(`Generated new visitor code for ${friendCode}: ${visitorBookingCode}`);
                                    // Proceed with booking using the new code
                                    performBookingUpdates(visitorBookingCode, slotIdsToBook);
                                }
                            });
                        };
                        generateUniqueCode(); // Start generation process
                        return; // Exit the current db.get callback, wait for generation
                    }

                    // If visitor code was found immediately, proceed
                    performBookingUpdates(visitorBookingCode, slotIdsToBook);
                });

                // Helper function to perform DB updates after code is determined
                const performBookingUpdates = (codeToUse, idsToUpdate) => {
                    // --- Step 3c: Update availability_slots ---
                    const updateSlotsSql = `
                        UPDATE availability_slots
                        SET is_booked = TRUE
                        WHERE id IN (${idsToUpdate.map(() => '?').join(',')})
                    `; // Creates placeholder string like (?,?,?)

                    db.run(updateSlotsSql, idsToUpdate, function(err) { // Use 'this'
                        if (err) {
                            console.error("Error updating availability slots:", err.message);
                            db.run("ROLLBACK;");
                            return res.status(500).json({ error: "Database error updating slot status." });
                        }
                        // Check if the expected number of rows were updated
                         if (this.changes !== idsToUpdate.length) {
                             console.warn(`Concurrency issue? Expected to update ${idsToUpdate.length} slots, but updated ${this.changes}. Rolling back.`);
                             db.run("ROLLBACK;");
                             return res.status(509).json({ error: "Booking conflict detected during update. Please try again." }); // 509 Bandwidth Limit Exceeded? Or maybe 409 Conflict again.
                         }
                        console.log(`Successfully marked ${this.changes} slots as booked.`);

                        // --- Step 3d: Insert into bookings table ---
                        const insertBookingSql = `
                            INSERT INTO bookings (visitor_booking_code, visitor_friend_code, visitor_message, booking_start_time, booking_end_time)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        db.run(insertBookingSql, [codeToUse, friendCode, message || null, startISO, endISO], function(err) { // Use 'this'
                            if (err) {
                                console.error("Error inserting booking record:", err.message);
                                db.run("ROLLBACK;");
                                return res.status(500).json({ error: "Database error creating booking record." });
                            }
                            const bookingId = this.lastID;
                            console.log(`Successfully inserted booking record ID: ${bookingId} for visitor ${codeToUse}`);

                            // --- Step 3e: Commit Transaction ---
                            db.run("COMMIT;", (commitErr) => {
                                if (commitErr) {
                                    console.error("Error committing transaction:", commitErr.message);
                                    // Rollback might have already happened implicitly?
                                    return res.status(500).json({ error: "Database error finalizing booking." });
                                }

                                console.log(`Booking successful for ${friendCode} (${codeToUse}).`);
                                // --- Step 4: Send Response ---
                                res.status(201).json({
                                    message: "Booking successful!",
                                    visitorBookingCode: codeToUse,
                                    bookingId: bookingId // Optionally return the booking ID
                                });
                            }); // End Commit
                        }); // End Insert Booking
                    }); // End Update Slots
                }; // End performBookingUpdates function definition
            }); // End db.all for finding available slots
        }); // End db.get for checking booked slots
    }); // End db.serialize (Transaction)
});

// --- IMPORTANT: Make sure your generateCode() function is still present somewhere ---
// It was defined in the original index.js you provided. Keep it.
function generateCode() {
    // Generate a 6-character alphanumeric code (example)
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
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