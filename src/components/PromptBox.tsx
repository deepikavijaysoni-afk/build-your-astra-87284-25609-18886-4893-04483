import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Square, Edit, MessageCircle } from 'lucide-react';

interface PromptBoxProps {
  onSendMessage?: (message: string, file?: File) => void;
  isProcessing?: boolean;
  onStop?: () => void;
}

export function PromptBox({
  onSendMessage,
  isProcessing = false,
  onStop,
}: PromptBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prompts = [
    'Create a crypto wallet interface',
    'Build a trading dashboard',
    'Design a marketing homepage',
    'Develop a mobile app prototype',
    'Build an authentication system',
    'Create an AI-powered assistant',
    'Set up a pricing page',
  ];

  useEffect(() => {
    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const animatePlaceholder = () => {
      const currentPrompt = prompts[currentIndex];

      if (!isDeleting) {
        if (charIndex < currentPrompt.length) {
          setPlaceholderText(currentPrompt.slice(0, charIndex + 1));
          charIndex++;
          timeoutId = setTimeout(animatePlaceholder, 50);
        } else {
          timeoutId = setTimeout(() => {
            isDeleting = true;
            animatePlaceholder();
          }, 4000);
        }
      } else {
        if (charIndex > 0) {
          setPlaceholderText(currentPrompt.slice(0, charIndex - 1));
          charIndex--;
          timeoutId = setTimeout(animatePlaceholder, 30);
        } else {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % prompts.length;
          timeoutId = setTimeout(animatePlaceholder, 300);
        }
      }
    };

    animatePlaceholder();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Reset height to auto to get proper scrollHeight
      textarea.style.height = 'auto';
      
      const lineHeight = 24;
      const minHeight = lineHeight * 2; // 2 lines minimum
      const maxHeight = lineHeight * 9; // 9 lines maximum
      
      // Calculate the required height
      const scrollHeight = textarea.scrollHeight;
      
      if (scrollHeight <= minHeight) {
        textarea.style.height = minHeight + 'px';
        textarea.style.overflowY = 'hidden';
      } else if (scrollHeight <= maxHeight) {
        textarea.style.height = scrollHeight + 'px';
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = maxHeight + 'px';
        textarea.style.overflowY = 'auto';
      }
    }
  }, [inputValue]);

  const getPlaceholder = () => {
    if (selectedFile) {
      return `Ask about ${selectedFile.name}...`;
    }

    return placeholderText;
  };

  const sendMessage = () => {
    if (!inputValue.trim() && !selectedFile) return;

    if (onSendMessage) {
      onSendMessage(inputValue, selectedFile || undefined);
    }
    setInputValue('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div className="relative rounded-2xl shadow-2xl shadow-blue-500/20 p-[2px] bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-purple-500 animate-border-flow">
        <div className="bg-[#0a0a0a] rounded-2xl h-full">
          {selectedFile && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 text-sm text-gray-400">
              <Paperclip size={14} />
              <span>{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="ml-auto text-gray-500 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          )}

          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={getPlaceholder()}
              className="w-full bg-transparent border-none outline-none text-white placeholder-gray-500 text-base resize-none break-words overflow-y-auto overflow-x-hidden"
              style={{ 
                minHeight: '48px', 
                maxHeight: '216px', 
                lineHeight: '24px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                width: '100%'
              }}
              rows={1}
              disabled={isProcessing}
            />
          </div>

          <div className="relative flex items-center justify-between px-4 pb-4 pt-2">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                onClick={() => {}}
                title="Edit"
              >
                <Edit size={16} />
              </button>

              <button
                type="button"
                className={`p-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-500/20 text-red-400'
                    : 'hover:bg-white/10 text-gray-400 hover:text-white'
                }`}
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isProcessing ? (
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                  onClick={onStop}
                >
                  <Square size={16} />
                  <span>Stop</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    onClick={() => {}}
                    title="Discuss"
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={sendMessage}
                    disabled={!inputValue.trim() && !selectedFile}
                  >
                    <Send size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
