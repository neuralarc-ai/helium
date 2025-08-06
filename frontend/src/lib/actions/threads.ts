'use server';

export const generateThreadName = async (message: string): Promise<string> => {
  try {
    // Default name in case the API fails
    const defaultName =
      message.trim().length > 50
        ? message.trim().substring(0, 47) + '...'
        : message.trim();

    // Gemini API key should be stored in an environment variable
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Gemini API key not found');
      return defaultName;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "You are a helpful assistant that generates extremely concise titles (2-4 words maximum) for chat threads based on the user's message. Respond with only the title, no other text or punctuation."
              }
            ],
            role: "user"
          },
          {
            parts: [
              {
                text: `Generate an extremely brief title (2-4 words only) for a chat thread that starts with this message: "${message}"`
              }
            ],
            role: "user"
          }
        ],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return defaultName;
    }

    const data = await response.json();
    const generatedName = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // Return the generated name or default if empty
    return generatedName || defaultName;
  } catch (error) {
    console.error('Error generating thread name:', error);
    // Fall back to using a truncated version of the message
    return message.trim().length > 50
      ? message.trim().substring(0, 47) + '...'
      : message.trim();
  }
};
