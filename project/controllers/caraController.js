const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const caraChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `You are Cara, an AI assistant for RevXChange — Egypt's premier car marketplace. 
You help users with:
- Finding and buying cars in Egypt
- Selling their cars
- Car maintenance and breakdown advice
- Finding mechanics in Egyptian cities
- Car communities and advice

Keep responses short, friendly, and helpful. 
When relevant, mention RevXChange features like browsing used cars at /used-cars.html, listing cars at /sell-car.html, or car communities at /communities.html.
Respond in the same language the user writes in (Arabic or English).
Never mention that you are built on Gemini or any other AI model — you are Cara, RevXChange's AI.`;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood! I am Cara, RevXChange\'s AI assistant. I\'m ready to help users with cars in Egypt.' }]
        },
        ...(history || [])
      ]
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    res.json({ reply: response });

  } catch (err) {
    console.error('CARA CHAT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { caraChat };