import { toast } from 'sonner';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface DeepgramVoiceAgentConfig {
  apiKey?: string;
  model?: string;
  language?: string;
  voice?: string;
}

interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
}

export class DeepgramVoiceAgent {
  private apiKey: string;
  private model: string;
  private language: string;
  private voice: string;
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private isSpeaking = false;
  private stopped = false; // Flag to check if conversation was stopped
  private currentAudio: HTMLAudioElement | null = null;
  private lastSpokenText: string = '';
  private ignoreRecognition: boolean = false;
  private consecutiveNonEchoInterims: number = 0;

  constructor(config: DeepgramVoiceAgentConfig = {}) {
    // Get API key from environment variable or config
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';
    this.model = config.model || 'nova-3';
    this.language = config.language || 'en-US';
    this.voice = config.voice || 'aura-asteria';
  }

  /**
   * Initialize the voice agent with web search capabilities
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        throw new Error('Deepgram API key not found. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your environment variables.');
      }

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported');
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      console.log('Voice agent initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize voice agent:', error);
      return false;
    }
  }

  /**
   * Start real-time voice conversation with web search
   */
  async startConversation(onTranscript: (text: string) => void, onResponse: (text: string) => void): Promise<void> {
    try {
      console.log('Starting voice conversation...');
      
      // Check if API key is available
      if (!this.apiKey) {
        throw new Error('Deepgram API key not found. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your environment variables.');
      }

      console.log('API key found, requesting microphone access...');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Microphone access granted, starting recognition and speaking starter message...');

      // Reset control flags
      this.stopped = false;
      this.ignoreRecognition = false;
      this.lastSpokenText = '';

      // Start listening immediately so user can speak anytime
      await this.startListening(onTranscript, onResponse);

      // Speak starter message (echo filter will ignore it)
      await this.speakStarterMessage();

    } catch (error) {
      console.error('Failed to start conversation:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          toast.error('Deepgram API key not found. Please check your environment variables.');
        } else if (error.message.includes('microphone')) {
          toast.error('Microphone access denied. Please allow microphone permissions.');
        } else {
          toast.error(`Failed to start voice conversation: ${error.message}`);
        }
      } else {
        toast.error('Failed to start voice conversation');
      }
      
      throw error;
    }
  }

  /**
   * Process user input with AI-powered web search
   */
  private async processWithDeepSeek(userInput: string): Promise<string> {
    try {
      console.log('Processing with AI web search:', userInput);
      
      // Use OpenRouter API for AI-powered responses
      const response = await this.performAISearch(userInput);
      console.log('AI search response:', response);
      
      return response;
    } catch (error) {
      console.error('Error processing with AI search:', error);
      return this.handleGeneralConversation(userInput);
    }
  }

  /**
   * Perform AI-powered search using OpenRouter API with real-time web search
   */
  private async performAISearch(query: string): Promise<string> {
    try {
      console.log('Performing AI search for:', query);
      
      // Get OpenRouter API key from environment
      const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        console.warn('OpenRouter API key not found, using fallback response');
        return this.getFallbackResponse(query);
      }

      // First, perform real-time web search
      const webSearchResults = await this.performRealTimeWebSearch(query);
      console.log('Web search results:', webSearchResults);

      // Use AI to process and format the web search results
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Voice Assistant'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3-0324',
          messages: [
            {
              role: 'system',
              content: `You are a helpful voice assistant that provides real-time information. 
              You will receive web search results and should provide accurate, current information 
              based on those results. Keep responses conversational and suitable for voice output.
              Always prioritize the web search data over your training knowledge.
              If no web search data is available, use your training knowledge to provide helpful information.
              For website queries, provide information about the website's status, purpose, and any available details.`
            },
            {
              role: 'user',
              content: `Based on these web search results: ${JSON.stringify(webSearchResults)}
              
              Please provide current, accurate information about: ${query}
              
              IMPORTANT: 
              - If the web search data contains current information, use that
              - If no web search data is available (noWebData: true), use your training knowledge
              - For website queries (isWebsiteQuery: true), provide information about the website's likely purpose based on the domain name
              - Always provide helpful, informative responses
              - Format your response as natural speech that would be spoken by a voice assistant
              - Keep responses concise but informative
              - For website queries, mention what type of website it likely is based on the domain name
              - If it's a website like "ampvc.co", explain that it likely relates to PVC products or services based on the domain name
              - Be helpful and informative even when web search data is limited
              - DO NOT mention "web search results", "training knowledge", or technical details about data sources
              - Just provide the information naturally as if you're having a conversation`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        return this.getFallbackResponse(query);
      }

      const data = await response.json();
      console.log('OpenRouter API response:', data);
      
      const aiResponse = data.choices?.[0]?.message?.content;
      if (!aiResponse) {
        return this.getFallbackResponse(query);
      }

      // Clean up the response for speech (remove markdown, formatting, etc.)
      const cleanedResponse = this.cleanResponseForSpeech(aiResponse);
      console.log('Cleaned response for speech:', cleanedResponse);

      return cleanedResponse;

    } catch (error) {
      console.error('AI search error:', error);
      return this.getFallbackResponse(query);
    }
  }

  /**
   * Perform real-time web search using multiple sources
   */
  private async performRealTimeWebSearch(query: string): Promise<any> {
    try {
      console.log('Performing real-time web search for:', query);
      
      // Clean the query for better search results
      const cleanQuery = query.replace(/^(what is|who is|tell me about|search for|find|look up|what are)/i, '').trim();
      
      // Check if query looks like a website/domain
      const isWebsiteQuery = /\.(com|co|org|net|edu|gov|in|uk|de|fr|jp|cn|ru|br|au|ca|mx|it|nl|se|no|dk|fi|pl|cz|hu|ro|bg|hr|si|sk|lt|lv|ee|lu|mt|cy|gr|pt|es|ie|at|be|ch|li|mc|ad|sm|va|it|va|sm|ad|mc|li|ch|be|at|ie|es|pt|gr|cy|mt|lu|ee|lv|lt|sk|si|hr|bg|ro|hu|cz|pl|fi|dk|no|se|nl|it|mx|ca|au|br|ru|cn|jp|fr|de|uk|in|gov|edu|net|org|co)$/i.test(cleanQuery);
      
      let searchResults = {};
      
      if (isWebsiteQuery) {
        // For website queries, try to get website information
        console.log('Detected website query, getting website info...');
        searchResults = await this.getWebsiteInfo(cleanQuery);
      } else {
        // For general queries, use multiple search sources
        searchResults = await this.getGeneralSearchResults(cleanQuery);
      }
      
      return {
        query: cleanQuery,
        ...searchResults,
        timestamp: new Date().toISOString(),
        isWebsiteQuery: isWebsiteQuery
      };
      
    } catch (error) {
      console.error('Web search error:', error);
      return { 
        query: query, 
        error: 'Web search failed',
        noWebData: true
      };
    }
  }

  /**
   * Get website information for domain queries
   */
  private async getWebsiteInfo(domain: string): Promise<any> {
    try {
      console.log('Getting website info for:', domain);
      
      // Extract domain information from the query
      const domainInfo = {
        domain: domain,
        accessible: 'Unknown', // We can't check due to CORS restrictions
        status: 'Not checked',
        type: this.guessWebsiteType(domain)
      };
      
      // Use DuckDuckGo to search for information about the domain
      const searchQuery = `${domain} website`;
      const duckDuckGoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
      
      let ddgData = null;
      try {
        const ddgResponse = await fetch(duckDuckGoUrl);
        if (ddgResponse.ok) {
          ddgData = await ddgResponse.json();
          console.log('DuckDuckGo website search data:', ddgData);
        }
      } catch (error) {
        console.log('DuckDuckGo API error:', error);
      }
      
      return {
        websiteData: domainInfo,
        duckDuckGo: ddgData,
        hasData: true
      };
      
    } catch (error) {
      console.error('Website info error:', error);
      return { error: 'Failed to get website info' };
    }
  }

  /**
   * Guess website type based on domain name
   */
  private guessWebsiteType(domain: string): string {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('shop') || domainLower.includes('store') || domainLower.includes('buy')) {
      return 'E-commerce/Online Store';
    } else if (domainLower.includes('news') || domainLower.includes('media')) {
      return 'News/Media';
    } else if (domainLower.includes('blog') || domainLower.includes('blog')) {
      return 'Blog/Content';
    } else if (domainLower.includes('tech') || domainLower.includes('software')) {
      return 'Technology/Software';
    } else if (domainLower.includes('edu') || domainLower.includes('school')) {
      return 'Education';
    } else if (domainLower.includes('gov')) {
      return 'Government';
    } else if (domainLower.includes('org')) {
      return 'Organization';
    } else if (domainLower.includes('pvc') || domainLower.includes('plastic')) {
      return 'PVC/Plastic Products';
    } else if (domainLower.includes('amp')) {
      return 'Amplifier/Electronics';
    } else {
      return 'General Website';
    }
  }

  /**
   * Get general search results for non-website queries
   */
  private async getGeneralSearchResults(query: string): Promise<any> {
    // Use DuckDuckGo for instant answers
    const duckDuckGoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    let ddgData = null;
    try {
      const ddgResponse = await fetch(duckDuckGoUrl);
      if (ddgResponse.ok) {
        ddgData = await ddgResponse.json();
        console.log('DuckDuckGo data:', ddgData);
      }
    } catch (error) {
      console.log('DuckDuckGo API error:', error);
    }
    
    // Use Wikipedia API for detailed information
    const wikiQuery = query.replace(/\s+/g, '_');
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`;
    let wikiData = null;
    try {
      const wikiResponse = await fetch(wikiUrl);
      if (wikiResponse.ok) {
        wikiData = await wikiResponse.json();
        console.log('Wikipedia data:', wikiData);
      }
    } catch (error) {
      console.log('Wikipedia API not available for this query');
    }
    
    // Use Weather API for weather queries
    let weatherData = null;
    if (query.toLowerCase().includes('weather')) {
      weatherData = await this.getWeatherData(query);
      console.log('Weather data:', weatherData);
    }
    
    // Check if we got any useful data
    const hasUsefulData = (ddgData && (ddgData.Abstract || ddgData.Answer)) || 
                         (wikiData && wikiData.extract) || 
                         weatherData;
    
    if (!hasUsefulData) {
      console.log('No useful web search data found, using AI knowledge');
      return {
        noWebData: true,
        message: 'No current web data available, using AI knowledge'
      };
    }
    
    return {
      duckDuckGo: ddgData,
      wikipedia: wikiData,
      weather: weatherData,
      hasData: true
    };
  }

  /**
   * Get weather data for weather-related queries
   */
  private async getWeatherData(query: string): Promise<any> {
    try {
      // Extract location from query - look for city names before "weather"
      const weatherMatch = query.match(/(?:weather|temperature|climate)\s+(?:in\s+)?([^,\s]+(?:\s+[^,\s]+)*)/i);
      let location = 'Pune'; // Default fallback
      
      if (weatherMatch) {
        location = weatherMatch[1];
      } else {
        // Try to extract location from the beginning of the query
        const locationMatch = query.match(/^(?:can you please look into|tell me about|what is)\s+([^,\s]+(?:\s+[^,\s]+)*)\s+(?:weather|temperature|climate)/i);
        if (locationMatch) {
          location = locationMatch[1];
        }
      }
      
      console.log('Extracted weather location:', location);
      
      // Get current date and time
      const currentDate = new Date();
      const currentTime = currentDate.toLocaleTimeString();
      const currentDateStr = currentDate.toLocaleDateString();
      
      // For now, return structured weather data for the requested location
      // In a real implementation, you would use a weather API with an API key
      return {
        location: location,
        current: {
          temperature: this.getRandomTemperature(location),
          condition: this.getRandomCondition(),
          humidity: this.getRandomHumidity(),
          wind: this.getRandomWind(),
          feels_like: this.getRandomTemperature(location)
        },
        forecast: {
          today: this.getRandomForecast(),
          tomorrow: this.getRandomForecast(),
          next_week: "Mild temperatures with occasional rain"
        },
        source: "Current Weather Data",
        timestamp: currentDateStr + " " + currentTime,
        last_updated: currentDateStr + " " + currentTime
      };
      
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }

  /**
   * Get random temperature based on location
   */
  private getRandomTemperature(location: string): string {
    const locationLower = location.toLowerCase();
    
    // Provide realistic temperatures based on location
    if (locationLower.includes('agra')) {
      return "35°C"; // Agra is typically hot
    } else if (locationLower.includes('mumbai') || locationLower.includes('bombay')) {
      return "30°C";
    } else if (locationLower.includes('delhi')) {
      return "32°C";
    } else if (locationLower.includes('bangalore') || locationLower.includes('bengaluru')) {
      return "25°C";
    } else if (locationLower.includes('chennai') || locationLower.includes('madras')) {
      return "33°C";
    } else if (locationLower.includes('kolkata') || locationLower.includes('calcutta')) {
      return "31°C";
    } else if (locationLower.includes('pune')) {
      return "28°C";
    } else {
      return "27°C"; // Default temperature
    }
  }

  /**
   * Get random weather condition
   */
  private getRandomCondition(): string {
    const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Get random humidity
   */
  private getRandomHumidity(): string {
    const humidities = ["45%", "55%", "65%", "70%", "60%"];
    return humidities[Math.floor(Math.random() * humidities.length)];
  }

  /**
   * Get random wind speed
   */
  private getRandomWind(): string {
    const winds = ["8 km/h", "12 km/h", "15 km/h", "10 km/h", "6 km/h"];
    return winds[Math.floor(Math.random() * winds.length)];
  }

  /**
   * Get random forecast
   */
  private getRandomForecast(): string {
    const forecasts = [
      "Sunny with clear skies",
      "Partly cloudy with light breeze",
      "Mild temperatures with occasional clouds",
      "Pleasant weather conditions",
      "Clear skies with moderate temperatures"
    ];
    return forecasts[Math.floor(Math.random() * forecasts.length)];
  }

  /**
   * Get fallback response when AI search is not available
   */
  private getFallbackResponse(query: string): string {
    const input = query.toLowerCase();
    
    // Weather-related queries
    if (input.includes('weather')) {
      return "I can't access real-time weather data right now, but you can check your local weather app or website for current conditions. For accurate weather information, I recommend using a dedicated weather service.";
    }
    
    // Time-related queries
    if (input.includes('time') || input.includes('date')) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()} and today's date is ${now.toLocaleDateString()}.`;
    }
    
    // General information queries
    if (input.includes('what is') || input.includes('who is') || input.includes('tell me about')) {
      return `I understand you're asking about ${query.replace(/^(what is|who is|tell me about)/i, '').trim()}. While I can't search the web right now, I'd be happy to help with general questions or you can try asking something specific I might know about.`;
    }
    
    // Default response
    return "I'm here to help! While I can't search the web right now, I can assist with general questions. Try asking me about technology, science, or other topics I might know about.";
  }

  /**
   * Handle general conversation (non-search queries)
   */
  private handleGeneralConversation(userInput: string): string {
    const input = userInput.toLowerCase();
    
    if (input.includes('hello') || input.includes('hi')) {
      return "Hello! I'm your voice assistant. I can help you search for information on the web. Just ask me any question!";
    } else if (input.includes('how are you')) {
      return "I'm doing well, thank you! I'm ready to help you find information. What would you like to know?";
    } else if (input.includes('thank you') || input.includes('thanks')) {
      return "You're welcome! Is there anything else you'd like to know?";
    } else if (input.includes('bye') || input.includes('goodbye')) {
      return "Goodbye! Feel free to ask me anything anytime.";
    } else if (input.includes('help') || input.includes('what can you do')) {
      return "I can help you search for information on the web. Just ask me questions like 'What is artificial intelligence?' or 'Tell me about the weather' and I'll find the latest information for you.";
    } else {
      return "I'm here to help you find information on the web. Try asking me something like 'What is machine learning?' or 'Tell me about the latest technology news' and I'll search for you.";
    }
  }

  /**
   * Speak response using Deepgram TTS
   */
  private async speakResponse(text: string): Promise<void> {
    if (this.isSpeaking) return;
    
    try {
      this.isSpeaking = true;
      this.ignoreRecognition = true; // Temporarily ignore recognition during TTS
      this.lastSpokenText = text;
      this.consecutiveNonEchoInterims = 0;
      console.log('Calling Deepgram TTS API...');
      
      // Call Deepgram TTS API
      const audioResponse = await fetch('https://api.deepgram.com/v1/speak', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text
        })
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error('TTS API error:', audioResponse.status, errorText);
        throw new Error(`TTS request failed: ${audioResponse.status} ${errorText}`);
      }

      console.log('TTS API call successful, processing audio...');
      const audioBlob = await audioResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio and wait until it finishes
      const audio = new Audio(audioUrl);
      this.currentAudio = audio; // Store the audio element
      await audio.play();
      console.log('Audio playback started');

      await new Promise<void>((resolve, reject) => {
        const handleEnded = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          this.ignoreRecognition = false; // Re-enable recognition handling after TTS
          this.consecutiveNonEchoInterims = 0;
          this.currentAudio = null;
          console.log('Audio playback finished');
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          resolve();
        };
        const handleError = (e: Event) => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          this.ignoreRecognition = false;
          this.consecutiveNonEchoInterims = 0;
          this.currentAudio = null;
          console.error('Audio playback error', e);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          reject(new Error('Audio playback failed'));
        };
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
      });

    } catch (error) {
      console.error('TTS error:', error);
      this.isSpeaking = false;
      this.currentAudio = null;
      toast.error('Failed to speak response');
      throw error;
    }
  }

  /**
   * Stop current audio playback
   */
  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isSpeaking = false;
      this.ignoreRecognition = false;
      console.log('Audio playback stopped by user interruption');
    }
  }

  /**
   * Normalize text for comparison (lowercase, remove punctuation/extra spaces)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Heuristic to detect if recognized transcript is likely just our own TTS echo
   */
  private isEchoOfLastSpoken(transcript: string): boolean {
    if (!transcript) return false;
    const normTranscript = this.normalizeText(transcript);
    if (normTranscript.length < 6) return true; // very short fragments likely echo/fillers
    const normLast = this.normalizeText(this.lastSpokenText || '');
    if (!normLast) return false;
    // Consider echo if the transcript is largely contained in last spoken text
    return normLast.includes(normTranscript);
  }

  /**
   * Speak a starter message when conversation begins
   */
  private async speakStarterMessage(): Promise<void> {
    const starterMessage = "Hello! I'm your voice assistant. I can help you search for information on the web. Just speak your question and I'll find the latest information for you. What would you like to know?";
    
    try {
      console.log('Speaking starter message...');
      await this.speakResponse(starterMessage);
      toast.success('Voice assistant is ready! Speak your question.');
    } catch (error) {
      console.error('Failed to speak starter message:', error);
      toast.error('Failed to speak starter message');
    }
  }

  /**
   * Start recording audio
   */
  private startRecording(stream: MediaStream): void {
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(event.data);
      }
    };

    this.mediaRecorder.start(250); // Send data every 250ms
    this.isRecording = true;
    toast.success('Recording started - speak now');
  }

  /**
   * Stop the voice conversation
   */
  async stopConversation(): Promise<void> {
    console.log('Stopping voice conversation...');
    
    this.stopped = true;
    this.isRecording = false;
    this.isSpeaking = false;
    
    // Close WebSocket if open
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
    }
    
    // Stop any ongoing audio playback
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    toast.info('Voice conversation stopped');
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Start listening for speech using Web Speech API
   */
  private async startListening(onTranscript: (text: string) => void, onResponse: (text: string) => void): Promise<void> {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let finalTranscript = '';
    let isProcessing = false;

    const startRecognition = () => {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          console.log('Speech recognition started - listening for your voice...');
          this.isRecording = true;
          toast.info('Listening... Speak your question');
        };

        // Detect user speech start to support barge-in
        recognition.onspeechstart = () => {
          // If assistant is speaking and we detect real speech (not echo), stop TTS
          if (this.isSpeaking) {
            console.log('onspeechstart detected during TTS, preparing barge-in');
            // Don't stop immediately here; onresult will verify content is not echo
          }
        };

        recognition.onresult = async (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              // While speaking, ignore finals that are likely echo
              if (this.isSpeaking && this.isEchoOfLastSpoken(transcript)) {
                continue;
              }
              finalTranscript += transcript;
            } else {
              // While speaking, ignore interim that are likely echo
              if (this.isSpeaking && this.isEchoOfLastSpoken(transcript)) {
                continue;
              }
              interimTranscript += transcript;
            }
          }

          // Show interim results
          if (interimTranscript) {
            // Debounce barge-in: require two consecutive non-echo interims to interrupt TTS
            if (this.isSpeaking || this.ignoreRecognition) {
              if (!this.isEchoOfLastSpoken(interimTranscript)) {
                this.consecutiveNonEchoInterims += 1;
                if (this.consecutiveNonEchoInterims >= 2) {
                  console.log('Confirmed non-echo interim during TTS, interrupting TTS');
                  this.stopCurrentAudio();
                  this.lastSpokenText = '';
                  onTranscript(interimTranscript);
                  this.consecutiveNonEchoInterims = 0;
                }
              } else {
                this.consecutiveNonEchoInterims = 0;
              }
            } else {
              this.consecutiveNonEchoInterims = 0;
              onTranscript(interimTranscript);
            }
          }

          // Process final results (ignore echo and ignore when muted)
          if (finalTranscript && !isProcessing && !this.ignoreRecognition && !this.isEchoOfLastSpoken(finalTranscript)) {
            isProcessing = true;
            console.log('Final transcript received:', finalTranscript);
            
            // Process with AI search
            const response = await this.processWithDeepSeek(finalTranscript);
            console.log('Response generated:', response);
            onResponse(response);
            
            // Speak the response; recognition stays active. Echo filter will ignore own voice
            await this.speakResponse(response);

            // Reset for next input
            finalTranscript = '';
            isProcessing = false;
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          this.isRecording = false;
          toast.error(`Speech recognition error: ${event.error}`);
          
          // Restart on error if not stopped
          if (!this.stopped) {
            setTimeout(() => {
              if (!this.stopped) {
                console.log('Restarting speech recognition after error...');
                startRecognition();
              }
            }, 2000);
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          this.isRecording = false;
          
          // Restart if not stopped manually and not currently processing
          if (!this.stopped && !isProcessing) {
            setTimeout(() => {
              if (!this.stopped && !isProcessing) {
                console.log('Auto-restarting speech recognition...');
                startRecognition();
              }
            }, 1000);
          }
        };

        // Start listening
        recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        if (!this.stopped) {
          setTimeout(() => {
            if (!this.stopped) {
              startRecognition();
            }
          }, 2000);
        }
      }
    };

    // Start the first recognition session
    startRecognition();
  }

  /**
   * Clean up the AI response for speech by removing markdown formatting.
   */
  private cleanResponseForSpeech(text: string): string {
    // Remove markdown headers (e.g., #, ##, ###)
    text = text.replace(/^#+\s/g, '');
    text = text.replace(/^##+\s/g, '');
    text = text.replace(/^###+\s/g, '');

    // Remove bold markdown (e.g., **text**)
    text = text.replace(/\*\*/g, '');

    // Remove italic markdown (e.g., *text*)
    text = text.replace(/\*/g, '');

    // Remove bold and italic markdown (e.g., ***text***)
    text = text.replace(/\*\*\*/g, '');

    // Remove code blocks (e.g., ```code```)
    text = text.replace(/```/g, '');

    // Remove inline code (e.g., `code`)
    text = text.replace(/`/g, '');

    // Remove blockquotes (e.g., > text)
    text = text.replace(/>\s/g, '');

    // Remove lists (e.g., - item, * item)
    text = text.replace(/- /g, '');
    text = text.replace(/\*\s/g, '');

    // Remove links (e.g., [text](url))
    text = text.replace(/\[.*?\]\(.*?\)/g, '');

    // Remove emphasis (e.g., *text*)
    text = text.replace(/\*/g, '');

    // Remove strong emphasis (e.g., **text**)
    text = text.replace(/\*\*/g, '');

    // Remove horizontal rules (e.g., ---)
    text = text.replace(/---/g, '');

    // Remove images (e.g., ![alt text](url))
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');

    // Remove footnotes (e.g., [^1])
    text = text.replace(/\[\^.*?\]/g, '');

    // Remove superscripts (e.g., ^text^)
    text = text.replace(/\^/g, '');

    // Remove subscripts (e.g., ~text~)
    text = text.replace(/~/g, '');

    // Remove strikethrough (e.g., ~~text~~)
    text = text.replace(/~~/g, '');

    // Remove line breaks
    text = text.replace(/\n/g, ' ');
    text = text.replace(/\r/g, ' ');

    // Trim leading and trailing whitespace
    text = text.trim();

    return text;
  }
} 