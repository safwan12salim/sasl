import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

interface Props {
  roomId: string;
  onClose: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
}

export default function WebRTCPrivateChat({ roomId, onClose }: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = localStorage.getItem('sasl_token');

  useEffect(() => {
    const wsUrl = `ws://localhost:8000/ws/video/${roomId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle chat messages (text type)
        if (data.type === 'chat') {
          setMessages(prev => [...prev, data.text]);
        }
        // Also try to parse as plain text (some servers send raw text)
      } catch {
        // If not JSON, treat as plain text message
        setMessages(prev => [...prev, event.data]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomId, token]);

  const send = () => {
    if (!input.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send chat message through WebSocket
      wsRef.current.send(JSON.stringify({ type: 'chat', text: input }));
      setMessages(prev => [...prev, `Me: ${input}`]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="font-bold text-gray-800">Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="h-72 bg-gray-50 rounded-lg m-3 p-3 overflow-y-auto space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-20">
              {connected ? 'Start the conversation!' : 'Connecting...'}
            </p>
          )}
          {messages.map((m, i) => {
            const isMe = m.startsWith('Me:');
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-green-500 text-white rounded-br-md'
                      : 'bg-white shadow-sm border text-gray-700 rounded-bl-md'
                  }`}
                >
                  {m}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 transition"
          />
          <button
            onClick={send}
            className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600 transition"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}