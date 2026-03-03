import React, { useState } from 'react';
import { Sparkles, X, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { generateText, analyzeImage } from '../services/geminiService';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddText: (text: string) => void;
  getCanvasSnapshot: () => string;
}

const AIPanel: React.FC<AIPanelProps> = ({ isOpen, onClose, onAddText, getCanvasSnapshot }) => {
  const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!prompt.trim() && mode === 'generate') return;
    setIsLoading(true);
    setResult(null);

    try {
      if (mode === 'generate') {
        const text = await generateText(prompt);
        setResult(text);
      } else {
        const snapshot = getCanvasSnapshot();
        const analysis = await analyzeImage(snapshot, prompt);
        setResult(analysis);
      }
    } catch (e) {
      setResult("Oops! Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCanvas = () => {
    if (result) {
      onAddText(result);
      onClose();
      setResult(null);
      setPrompt('');
    }
  };

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-800">Gemini Assistant</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => { setMode('generate'); setResult(null); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'generate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare size={16} />
            Generate Ideas
          </div>
        </button>
        <button
          onClick={() => { setMode('analyze'); setResult(null); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'analyze' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ImageIcon size={16} />
            Analyze Sketch
          </div>
        </button>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {mode === 'generate' ? 'What should I write about?' : 'Ask about your sketch (optional):'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'generate' ? "E.g., A haiku about silence..." : "E.g., What does this look like?"}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24 text-sm"
        />
      </div>

      {/* Result Display */}
      {result && (
        <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{result}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={isLoading || (mode === 'generate' && !prompt)}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thinking...
              </>
            ) : (
              'Run'
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => setResult(null)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleAddToCanvas}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              Add to Sheet
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIPanel;
