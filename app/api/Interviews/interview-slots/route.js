
import { google } from 'googleapis';
import moment from 'moment-timezone';


const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
});

// Helper function to generate time slots
function generateTimeSlots(date, startHour = 9, endHour = 17, duration = 30) {
    const slots = [];
    const currentDate = moment(date).startOf('day');

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += duration) {
            const startTime = currentDate.clone().add(hour, 'hours').add(minute, 'minutes');
            const endTime = startTime.clone().add(duration, 'minutes');

            // Skip if end time exceeds working hours
            if (endTime.hour() > endHour || (endTime.hour() === endHour && endTime.minute() > 0)) {
                continue;
            }

            slots.push({
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                display: `${startTime.format('HH:mm')} to ${endTime.format('HH:mm')}`
            });
        }
    }

    return slots;
}

// API: Get available interview slots for HR
app.post('/api/interview-slots/available', async (req, res) => {
    try {
        const {
            hrEmail,
            date,
            duration = 30
        } = req.body;

        if (!hrEmail || !date) {
            return res.status(400).json({
                error: 'HR email and date are required'
            });
        }

        // Get HR user from Firebase
        const hrSnapshot = await db.collection('users')
            .where('email', '==', hrEmail)
            .where('role', '==', 'hr')
            .limit(1)
            .get();

        if (hrSnapshot.empty) {
            return res.status(404).json({
                error: 'HR not found'
            });
        }

        const hrData = hrSnapshot.docs[0].data();
        const hrCalendarId = hrData.googleCalendarId || hrEmail;

        // Generate all possible slots for the day
        const allSlots = generateTimeSlots(date, 9, 17, duration);

        // Get busy times from Google Calendar
        const startTime = moment(date).startOf('day').toISOString();
        const endTime = moment(date).endOf('day').toISOString();

        const busyTimesResponse = await calendar.freebusy.query({
            requestBody: {
                timeMin: startTime,
                timeMax: endTime,
                items: [{
                    id: hrCalendarId
                }]
            }
        });

        const busyTimes = busyTimesResponse.data.calendars[hrCalendarId].busy || [];

        // Get booked interviews from Firebase
        const bookedInterviews = await db.collection('interviews')
            .where('hrEmail', '==', hrEmail)
            .where('date', '==', date)
            .where('status', 'in', ['scheduled', 'confirmed'])
            .get();

        const bookedSlots = bookedInterviews.docs.map(doc => ({
            start: doc.data().startTime,
            end: doc.data().endTime
        }));

        // Filter available slots
        const availableSlots = allSlots.filter(slot => {
            // Check against Google Calendar busy times
            const isGoogleBusy = busyTimes.some(busy => {
                return moment(slot.start).isBetween(busy.start, busy.end, null, '[)') ||
                    moment(slot.end).isBetween(busy.start, busy.end, null, '(]') ||
                    (moment(slot.start).isSameOrBefore(busy.start) &&
                        moment(slot.end).isSameOrAfter(busy.end));
            });

            // Check against Firebase booked slots
            const isFirebaseBooked = bookedSlots.some(booked => {
                return moment(slot.start).isBetween(booked.start, booked.end, null, '[)') ||
                    moment(slot.end).isBetween(booked.start, booked.end, null, '(]') ||
                    (moment(slot.start).isSameOrBefore(booked.start) &&
                        moment(slot.end).isSameOrAfter(booked.end));
            });

            return !isGoogleBusy && !isFirebaseBooked;
        });

        // Format response
        const formattedSlots = {};
        availableSlots.forEach(slot => {
            const dateKey = moment(slot.start).format('DD-MM-YYYY');
            if (!formattedSlots[dateKey]) {
                formattedSlots[dateKey] = [];
            }
            formattedSlots[dateKey].push({
                time: slot.display,
                startTime: slot.start,
                endTime: slot.end,
                available: true
            });
        });

        res.json({
            success: true,
            hrEmail,
            slots: formattedSlots,
            totalAvailable: availableSlots.length
        });

    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({
            error: 'Failed to fetch available slots',
            details: error.message
        });
    }
});

// API: Book an interview slot
app.post('/api/interview-slots/book', async (req, res) => {
    try {
        const {
            hrEmail,
            candidateEmail,
            candidateName,
            startTime,
            endTime,
            interviewType = 'Technical',
            meetingLink,
            notes
        } = req.body;

        if (!hrEmail || !candidateEmail || !startTime || !endTime) {
            return res.status(400).json({
                error: 'Required fields missing'
            });
        }

        // Check if slot is still available
        const existingInterview = await db.collection('interviews')
            .where('hrEmail', '==', hrEmail)
            .where('startTime', '==', startTime)
            .where('status', 'in', ['scheduled', 'confirmed'])
            .limit(1)
            .get();

        if (!existingInterview.empty) {
            return res.status(409).json({
                error: 'This slot is no longer available'
            });
        }

        // Get HR calendar ID
        const hrSnapshot = await db.collection('users')
            .where('email', '==', hrEmail)
            .limit(1)
            .get();

        const hrCalendarId = hrSnapshot.empty ?
            hrEmail :
            (hrSnapshot.docs[0].data().googleCalendarId || hrEmail);

        // Create Google Calendar event
        const event = {
            summary: `Interview with ${candidateName} - ${interviewType}`,
            description: `
        Interview Type: ${interviewType}
        Candidate: ${candidateName} (${candidateEmail})
        ${notes ? `Notes: ${notes}` : ''}
      `,
            start: {
                dateTime: startTime,
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endTime,
                timeZone: 'Asia/Kolkata',
            },
            attendees: [{
                email: candidateEmail
            },
            {
                email: hrEmail
            }
            ],
            conferenceData: meetingLink ? {
                entryPoints: [{
                    entryPointType: 'video',
                    uri: meetingLink,
                }]
            } : undefined,
            reminders: {
                useDefault: false,
                overrides: [{
                    method: 'email',
                    minutes: 60
                },
                {
                    method: 'popup',
                    minutes: 15
                },
                ],
            },
        };

        const calendarEvent = await calendar.events.insert({
            calendarId: hrCalendarId,
            requestBody: event,
            conferenceDataVersion: meetingLink ? 1 : 0,
            sendUpdates: 'all'
        });

        // Save to Firebase
        const interviewData = {
            interviewId: db.collection('interviews').doc().id,
            hrEmail,
            candidateEmail,
            candidateName,
            startTime,
            endTime,
            date: moment(startTime).format('YYYY-MM-DD'),
            interviewType,
            meetingLink: meetingLink || calendarEvent.data.hangoutLink,
            googleEventId: calendarEvent.data.id,
            status: 'scheduled',
            notes,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('interviews').add(interviewData);

        // Send confirmation emails (implement your email service)
        await sendConfirmationEmails(hrEmail, candidateEmail, interviewData);

        res.json({
            success: true,
            message: 'Interview scheduled successfully',
            interviewId: docRef.id,
            googleEventId: calendarEvent.data.id,
            meetingLink: interviewData.meetingLink,
            details: interviewData
        });

    } catch (error) {
        console.error('Error booking interview:', error);
        res.status(500).json({
            error: 'Failed to book interview',
            details: error.message
        });
    }
});

// API: Cancel/Reschedule interview
app.put('/api/interview-slots/cancel/:interviewId', async (req, res) => {
    try {
        const {
            interviewId
        } = req.params;
        const {
            reason
        } = req.body;

        // Get interview from Firebase
        const interviewDoc = await db.collection('interviews').doc(interviewId).get();

        if (!interviewDoc.exists) {
            return res.status(404).json({
                error: 'Interview not found'
            });
        }

        const interviewData = interviewDoc.data();

        // Cancel Google Calendar event
        if (interviewData.googleEventId) {
            const hrSnapshot = await db.collection('users')
                .where('email', '==', interviewData.hrEmail)
                .limit(1)
                .get();

            const hrCalendarId = hrSnapshot.empty ?
                interviewData.hrEmail :
                (hrSnapshot.docs[0].data().googleCalendarId || interviewData.hrEmail);

            await calendar.events.delete({
                calendarId: hrCalendarId,
                eventId: interviewData.googleEventId,
                sendUpdates: 'all'
            });
        }

        // Update Firebase
        await db.collection('interviews').doc(interviewId).update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Interview cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling interview:', error);
        res.status(500).json({
            error: 'Failed to cancel interview',
            details: error.message
        });
    }
});

// API: Get multiple days availability
app.post('/api/interview-slots/multi-day-availability', async (req, res) => {
    try {
        const {
            hrEmail,
            startDate,
            endDate,
            duration = 30
        } = req.body;

        if (!hrEmail || !startDate || !endDate) {
            return res.status(400).json({
                error: 'HR email, start date and end date are required'
            });
        }

        const start = moment(startDate);
        const end = moment(endDate);
        const daysDiff = end.diff(start, 'days');

        if (daysDiff > 30) {
            return res.status(400).json({
                error: 'Date range cannot exceed 30 days'
            });
        }

        const allAvailability = {};

        for (let i = 0; i <= daysDiff; i++) {
            const currentDate = start.clone().add(i, 'days');

            // Skip weekends if needed
            if (currentDate.day() === 0 || currentDate.day() === 6) {
                continue;
            }

            // Get availability for this day
            const response = await fetch(`${req.protocol}://${req.get('host')}/api/interview-slots/available`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hrEmail,
                    date: currentDate.format('YYYY-MM-DD'),
                    duration
                })
            });

            const dayData = await response.json();
            if (dayData.success && dayData.slots) {
                Object.assign(allAvailability, dayData.slots);
            }
        }

        res.json({
            success: true,
            hrEmail,
            dateRange: {
                start: startDate,
                end: endDate
            },
            slots: allAvailability
        });

    } catch (error) {
        console.error('Error fetching multi-day availability:', error);
        res.status(500).json({
            error: 'Failed to fetch availability',
            details: error.message
        });
    }
});

// Helper function to send confirmation emails
async function sendConfirmationEmails(hrEmail, candidateEmail, interviewData) {
    // Implement your email service here (SendGrid, AWS SES, etc.)
    console.log('Sending confirmation emails to:', hrEmail, candidateEmail);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Interview Scheduler API running on port ${PORT}`);
});