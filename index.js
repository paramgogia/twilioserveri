// server/index.js
import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Configuration Constants ---
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 5000;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
  console.error("Missing required Twilio environment variables.");
  process.exit(1);
}

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Setup Express
// Setup Express
const app = express();

// --- Specific CORS Configuration for localhost:3000 ---
const allowedOrigins = ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // The 'origin' is the URL of the frontend making the request
    // We allow the request if the origin is in our allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Use the new CORS options
app.use(cors(corsOptions));

// Continue with your other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Endpoints ---

// 1. Endpoint to initiate a call
app.post('/api/twilio/call', async (req, res) => {
  try {
    const { phoneNumber, userId } = req.body;
    
    console.log(`Server: Initiating call to ${phoneNumber} (User: ${userId || 'N/A'})`);
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Ensure the number is formatted correctly (Twilio requires E.164)
    let formattedNumber = phoneNumber.replace(/[\(\)\[\]\s-]/g, '');
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = `+${formattedNumber}`;
    }
    
    // Make the call using Twilio
    const call = await twilioClient.calls.create({
      // TwiML URL for instructions once the developer answers
      url: `https://twilioserveri.vercel.app/api/twilio/voice?context=${userId || 'general-alert'}`, 
      to: formattedNumber,
      from: TWILIO_NUMBER
    });
    
    console.log("Server: Call initiated with SID:", call.sid);
    
    res.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("Server: Error initiating Twilio call:", error);
    res.status(500).json({ error: error.message, detail: "Twilio API call failed." });
  }
});

// 2. TwiML endpoint for voice instructions (what the developer hears)
app.post('/api/twilio/voice', (req, res) => {
  const context = req.query.context || 'general-alert';
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  // Custom message for the developer
  response.say(
    { voice: 'alice' },
    `This is an automated alert from your Log Analytics Dashboard. ` +
    `An urgent issue was detected in the ${context.replace(/-/g, ' ')} system. ` +
    `Please check the dashboard immediately. Good bye.`
  );
  
  response.hangup();
  
  res.type('text/xml');
  res.send(response.toString());
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Twilio Number: ${TWILIO_NUMBER}`);
  console.log(`BASE_URL for TwiML: ${BASE_URL}`);
});

// export default app; // Removed export for direct execution