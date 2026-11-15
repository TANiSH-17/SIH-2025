const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key') return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// AI-Powered Universal Health Translator Route
router.post('/translate-record', async (req, res) => {
  const { text, language } = req.body;

  if (!text || !language) {
    return res.status(400).json({ error: 'Medical text and a target language are required.' });
  }

  // --- अपडेटेड, ज़्यादा विस्तृत प्रॉम्प्ट ---
  const prompt = `
    आपका काम है नीचे दिए गए मेडिकल टेक्स्ट को सरल, आसानी से समझ में आने वाली और थोड़ी विस्तृत ${language} में समझाना।
    इसे ऐसे समझाएं जैसे आप किसी मरीज़ के परिवार वाले से बात कर रहे हैं जिसे मेडिकल की कोई जानकारी नहीं है।

    **सख़्त नियम:**
    1. आपका पूरा जवाब सिर्फ़ और सिर्फ़ ${language} भाषा (जैसे हिंदी के लिए देवनागरी लिपि) में होना चाहिए।
    2. किसी भी अंग्रेज़ी शब्द, रोमन लिपि में लिखे अक्षर, या कोई भी ऐसा टेक्स्ट जो ${language} भाषा का हिस्सा नहीं है, उसका इस्तेमाल बिल्कुल न करें।
    3. आपका लहजा शांत और स्पष्ट होना चाहिए।
    4. आउटपुट में केवल विस्तृत ${language} अनुवाद ही होना चाहिए और कुछ नहीं।

    मेडिकल टेक्स्ट: "${text}"
  `;

  try {
    const model = getGeminiModel();
    if (!model) throw new Error('GEMINI_API_KEY is not configured or invalid');
    const result = await model.generateContent(prompt);
    const translation = result.response.text();
    return res.status(200).json({ translatedText: translation });
  } catch (error) {
    console.warn("AI translation error, using language summary fallback:", error.message);
    const fallbackTranslation = `[${language} अनुवाद]: ${text}`;
    return res.status(200).json({ translatedText: fallbackTranslation });
  }
});

module.exports = router;

