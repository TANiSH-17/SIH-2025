const axios = require('axios');
const Prediction = require('../models/Prediction');
const MedicalRecord = require('../models/medicalRecord');
const dbConnect = require('../lib/dbConnect');

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; 

// This function contains the core logic for a single prediction
async function generatePrediction(disease, location, lat, lon) {
  try {
    let temp = 28.0;
    let humidity = 65;

    // 1. Fetch live weather data if API key is provided
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (apiKey && apiKey !== 'your_openweather_api_key') {
      try {
        const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        if (weatherResponse.data && weatherResponse.data.main) {
          temp = weatherResponse.data.main.temp;
          humidity = weatherResponse.data.main.humidity;
        }
      } catch (weatherErr) {
        console.warn(`[Prediction Service] Weather API unavailable for ${location}, using estimated climate data.`);
      }
    }

    // 2. Simulate internal data analysis
    const searchRegex = new RegExp(disease.split(' ')[0], 'i');
    const recentSymptomCount = await MedicalRecord.countDocuments({
        details: { $regex: searchRegex },
        date: { $gte: new Date(new Date() - 14 * 24 * 60 * 60 * 1000) } // Check last 14 days
    });
    const symptomSpike = recentSymptomCount > 5; // A lower threshold for more sensitivity

    // 3. The "AI" Logic: Rules are now specific to each disease
    let riskLevel = 'Low Risk';
    let reasoning = `Normal environmental and symptom levels. Current Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%.`;

    // Dengue & Malaria (Mosquito-borne)
    if ((disease === 'Dengue' || disease === 'Malaria') && humidity > 70 && temp > 25) {
        riskLevel = 'Medium Risk';
        reasoning = `Elevated risk detected. Conditions are favorable for mosquito breeding with high humidity (${humidity}%) and warm temperatures (${temp.toFixed(1)}°C).`;
        if (symptomSpike) {
            riskLevel = 'High Risk';
            reasoning += ` A recent spike in related symptoms significantly increases the outbreak probability.`;
        }
    }

    // Influenza (Flu - Airborne)
    if (disease === 'Influenza' && temp < 20 && humidity < 50) {
        riskLevel = 'Medium Risk';
        reasoning = `Elevated risk detected. Cool and dry conditions (Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%) are ideal for influenza virus transmission.`;
        if (symptomSpike) {
            riskLevel = 'High Risk';
            reasoning += ` Combined with a recent spike in symptoms, the risk of an outbreak is high.`;
        }
    }

    // 4. Create or update the prediction in the database
    const predictionDate = new Date();
    predictionDate.setDate(predictionDate.getDate() + 14); // Predict 2 weeks into the future

    const predictedSpike = predictionDate.toLocaleString('en-US', { month: 'long', day: 'numeric' });

    const prediction = await Prediction.findOneAndUpdate(
        { disease, location }, // Find by disease and location
        {
            riskLevel,
            reasoning,
            predictedSpike,
            generatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    console.log(`[Prediction Service] Generated forecast for ${disease} in ${location}: ${riskLevel}`);
    return prediction;

  } catch (error) {
    // Check for 401 error from weather API (common if key is invalid)
    if (error.response && error.response.status === 401) {
        console.error(`[Prediction Service] Failed for ${location}: Invalid OpenWeather API key.`);
    } else {
        console.error(`[Prediction Service] Failed for ${location}:`, error.message);
    }
  }
}

// This function runs the model for all relevant diseases and cities
async function runPredictionModel() {
    console.log('[Prediction Service] Running prediction model...');
    try {
        await dbConnect();
    } catch (dbErr) {
        console.error('[Prediction Service] Failed to connect to database:', dbErr.message);
        return;
    }
    
    // Define the list of diseases and cities to monitor
    const locations = [
        { name: 'New Delhi, IN', lat: 28.61, lon: 77.20 },
        { name: 'Mumbai, IN', lat: 19.07, lon: 72.87 },
        { name: 'Chennai, IN', lat: 13.08, lon: 80.27 },
        { name: 'Kolkata, WB', lat: 22.57, lon: 88.36 },
        { name: 'Bengaluru, KA', lat: 12.97, lon: 77.59 },
    ];
    const diseases = ['Dengue', 'Influenza', 'Malaria'];

    // Use Promise.all to run predictions concurrently for efficiency
    const predictionPromises = [];
    for (const loc of locations) {
        for (const disease of diseases) {
            predictionPromises.push(generatePrediction(disease, loc.name, loc.lat, loc.lon));
        }
    }
    await Promise.all(predictionPromises);
    console.log('[Prediction Service] Prediction model run complete.');
}


// --- NEW: SEIR Hospital Outbreak Prediction Logic ---

// A basic SEIR model simulation
const runSEIRPrediction = (initialState, params, days) => {
  let { S, E, I, R, N } = initialState;
  const { beta, sigma, gamma } = params;
  
  const forecast = [];

  for (let day = 0; day < days; day++) {
    // Calculate new transitions based on current state
    const newlyExposed = (beta * I * S) / N;
    const newlyInfectious = sigma * E;
    const newlyRecovered = gamma * I;

    // Update the state for the next day
    S -= newlyExposed;
    E += newlyExposed - newlyInfectious;
    I += newlyInfectious - newlyRecovered;
    R += newlyRecovered;

    // Ensure values are not negative
    S = Math.max(0, S);
    E = Math.max(0, E);
    I = Math.max(0, I);
    R = Math.max(0, R);

    forecast.push({
      day: day + 1,
      susceptible: Math.round(S),
      exposed: Math.round(E),
      infectious: Math.round(I),
      recovered: Math.round(R),
    });
  }

  return forecast;
};

// Main function to be called by the API route
const generateWardForecast = async (hospitalId, wardName) => {
  // In a real system, you would fetch all patients in this specific ward
  // For this demo, we'll use example data.
  // TODO: Replace this with a real database query to get patient counts by status.
  const currentWardState = {
    totalPatients: 20,
    infectiousCount: 2,  // Patients with 'positive' MDR status
    exposedCount: 3,     // Patients with a recent high-risk exposure
    recoveredCount: 1,   // Patients with 'negative' status after being positive
  };

  // --- Model Parameters ---
  // These would be tuned based on the specific pathogen (e.g., MRSA)
  const modelParams = {
    beta: 0.5,    // Transmission rate
    sigma: 1/5,   // Incubation period (5 days)
    gamma: 1/10,  // Recovery period (10 days)
  };

  const N = currentWardState.totalPatients;
  const initialState = {
    I: currentWardState.infectiousCount,
    E: currentWardState.exposedCount,
    R: currentWardState.recoveredCount,
    S: N - currentWardState.infectiousCount - currentWardState.exposedCount - currentWardState.recoveredCount,
    N: N,
  };

  const forecastDays = 14;
  const forecast = runSEIRPrediction(initialState, modelParams, forecastDays);
  
  return { wardName, current: initialState, forecast };
};

// --- UPDATED: Export both the old and new functions ---
module.exports = { runPredictionModel, generateWardForecast };