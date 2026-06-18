import React, { useState, useRef, useEffect } from "react";
import {
  generateInterviewQuestion,
  generateFollowUpQuestion,
  generateTechnicalQuestion,
  generateScores,
} from "../../../services/cohereService";

function ChatInterface({ domain, resumeText, candidateProfile, onMessageCountUpdate }) {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const scoresRef = useRef(null);
  const timerRef = useRef(null);

  // ─── Timer ─────────────────────────────────────────────────────────────────
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(120);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (onMessageCountUpdate) onMessageCountUpdate(messages.length, scoresRef.current);
  }, [messages, onMessageCountUpdate]);

  useEffect(() => { getFirstQuestion(); }, []);

  useEffect(() => {
    setupSpeechRecognition();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      clearInterval(timerRef.current);
    };
  }, []);

  // ─── Speech Recognition ───────────────────────────────────────────────────
  const setupSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) setUserInput((prev) => prev + final + " ");
      setTranscript(interim);
    };

    recognitionRef.current.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "audio-capture") {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      if (shouldRestartRef.current) {
        try { recognitionRef.current.start(); } catch {
          shouldRestartRef.current = false;
          setIsListening(false);
        }
      }
    };
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      shouldRestartRef.current = true;
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      shouldRestartRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
      if (transcript) {
        setUserInput((prev) => prev + transcript);
        setTranscript("");
      }
    }
  };

  // ─── Speech Synthesis ─────────────────────────────────────────────────────
  const speakMessage = (text) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ─── Interview Logic ──────────────────────────────────────────────────────
  const getFirstQuestion = async () => {
    try {
      setIsTyping(true);
      setMessages([]);
      // Pass candidateProfile for resume-aware personalised opening
      const aiMessage = await generateInterviewQuestion(domain, resumeText, null, candidateProfile);
      await new Promise((r) => setTimeout(r, 400));
      setMessages([{ sender: "ai", text: aiMessage }]);
      setQuestionCount(1);
      speakMessage(aiMessage);
      resetTimer();
      setIsTyping(false);
    } catch (error) {
      console.error("Error fetching initial question:", error);
      const fallback = `Hi ${candidateProfile?.name || ""}! I've reviewed your profile and I'm excited to learn more. What first drew you to ${domain}?`;
      setMessages([{ sender: "ai", text: fallback }]);
      setQuestionCount(1);
      speakMessage(fallback);
      resetTimer();
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentInput = userInput;
    setUserInput("");
    setTranscript("");

    const updatedMessages = [...messages, { sender: "user", text: currentInput }];
    setMessages(updatedMessages);

    const conversationHistory = updatedMessages
      .map((m) => `${m.sender === "ai" ? "Interviewer" : "Candidate"}: ${m.text}`)
      .join("\n");

    setIsTyping(true);
    let aiMessage;
    try {
      if (questionCount <= 2) {
        aiMessage = await generateFollowUpQuestion(domain, resumeText, conversationHistory, candidateProfile);
      } else {
        aiMessage = await generateTechnicalQuestion(domain, resumeText, conversationHistory, candidateProfile);
      }
      setQuestionCount((prev) => prev + 1);
    } catch (error) {
      console.error("AI response error:", error);
      aiMessage = "That's interesting. Can you elaborate further on that?";
    }

    const finalMessages = [...updatedMessages, { sender: "ai", text: aiMessage }];
    setMessages(finalMessages);
    setIsTyping(false);
    speakMessage(aiMessage);
    resetTimer();

    // Generate scores after 8 messages
    if (finalMessages.length >= 8 && !scoresRef.current) {
      const fullHistory = finalMessages
        .map((m) => `${m.sender === "ai" ? "Interviewer" : "Candidate"}: ${m.text}`)
        .join("\n");
      try {
        const scores = await generateScores(fullHistory, domain);
        scoresRef.current = scores;
      } catch (err) {
        console.error("Score generation failed:", err);
      }
    }
  };

  const formatTime = (secs) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#111] p-3 border-b border-gray-800 flex justify-between items-center">
        <h2 className="font-bold text-base text-white">
          {domain} Interview
          {candidateProfile && (
            <span className="text-gray-500 font-normal text-sm ml-2">· {candidateProfile.name}</span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-400">
              {isListening ? 'Listening' : isSpeaking ? 'AI Speaking' : 'Ready'}
            </span>
          </div>
          <div className="text-xs text-gray-500">Q{questionCount}</div>
          <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
            timeLeft <= 30 ? 'text-red-400 bg-red-950 animate-pulse' : 'text-gray-400 bg-gray-800'
          }`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-[#1e1e1e] text-gray-100 border border-gray-700/50 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1e1e1e] border border-gray-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-3 bg-[#111] space-y-2">
        {transcript && (
          <p className="text-gray-500 text-xs italic px-1">Hearing: {transcript}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={startListening}
            disabled={isListening || isSpeaking}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isListening ? 'bg-green-700 text-white' : 'bg-green-800 hover:bg-green-700 text-white disabled:opacity-40'
            }`}
          >
            🎤 {isListening ? 'Listening...' : 'Speak'}
          </button>
          <button
            type="button"
            onClick={stopListening}
            disabled={!isListening}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-red-800 hover:bg-red-700 text-white disabled:opacity-40 transition-all"
          >
            Stop
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-grow px-4 py-2.5 bg-[#1e1e1e] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Type your response..."
          />
          <button
            type="submit"
            disabled={isSpeaking || !userInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatInterface;