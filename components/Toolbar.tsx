import React from 'react';
import { Pen, Type, Eraser, Sparkles, MousePointer2, Trash2, Download } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  onClear: () => void;
  onDownload: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  setActiveTool, 
  color, 
  setColor,
  onClear,
  onDownload
}) => {
  
  const tools = [
    { id: 'select' as ToolType, icon: MousePointer2, label: 'Select' },
    { id: 'pen' as ToolType, icon: Pen, label: 'Pen' },
    { id: 'text' as ToolType, icon: Type, label: 'Text' },
    { id: 'eraser' as ToolType, icon: Eraser, label: 'Eraser' },
    { id: 'ai' as ToolType, icon: Sparkles, label: 'AI Assistant' },
  ];

  const colors = [
    '#111827', // Black
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
  ];

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-2 flex items-center gap-2 border border-gray-100 z-50 transition-all duration-300">
      
      {/* Tools */}
      <div className="flex items-center gap-1 pr-4 border-r border-gray-200">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-3 rounded-xl transition-all duration-200 group relative ${
              activeTool === tool.id 
                ? 'bg-gray-100 text-gray-900 shadow-inner' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} className={activeTool === 'ai' && tool.id === 'ai' ? 'text-purple-600' : ''} />
            {tool.id === 'ai' && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Colors (only show if pen or text) */}
      {(activeTool === 'pen' || activeTool === 'text') && (
        <div className="flex items-center gap-2 px-4 border-r border-gray-200">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pl-2">
         <button
          onClick={onDownload}
          className="p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          title="Save as Image"
        >
          <Download size={20} />
        </button>
        <button
          onClick={onClear}
          className="p-3 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Clear Canvas"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
