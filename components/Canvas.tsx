import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, ToolType, Point, TextNode } from '../types';

interface CanvasProps {
  activeTool: ToolType;
  strokeColor: string;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  textNodes: TextNode[];
  setTextNodes: React.Dispatch<React.SetStateAction<TextNode[]>>;
  onCanvasReady: (getSnapshot: () => string) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  activeTool,
  strokeColor,
  strokes,
  setStrokes,
  textNodes,
  setTextNodes,
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  // Handling Text Inputs
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Initialize canvas size
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        // Simple full screen resize - in a production app we might want to preserve content scale/position
        // but for a "blank sheet" reset or just extending bounds is fine.
        // We will just update width/height which clears canvas, so we rely on the redraw effect.
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        requestAnimationFrame(redraw);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose snapshot function
  useEffect(() => {
    onCanvasReady(() => {
      if (!canvasRef.current) return '';
      // Create a temporary white canvas to composite
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvasRef.current, 0, 0);
        return tempCanvas.toDataURL('image/png');
      }
      return '';
    });
  }, [onCanvasReady]);

  // Redraw logic
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw saved strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.color;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        // Quadratic curve for smoother lines could go here, using simple lineTo for now
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Draw current stroke
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = currentStroke.width;
      ctx.strokeStyle = currentStroke.color;
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }
    
    // Note: Text is rendered as HTML overlays, not on canvas, for better editing UX
  }, [strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;
    
    // Prevent scrolling on touch
    if ('touches' in e) {
      // e.preventDefault(); // Sometimes needed, but can block UI interactions if not careful
    }

    const point = getPoint(e);
    setIsDrawing(true);
    
    const newStroke: Stroke = {
      id: Date.now().toString(),
      points: [point],
      color: activeTool === 'eraser' ? '#ffffff' : strokeColor,
      width: activeTool === 'eraser' ? 20 : 3
    };
    setCurrentStroke(newStroke);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke) return;
     // Prevent scrolling on touch
    // if ('touches' in e) e.preventDefault();

    const point = getPoint(e);
    const newPoints = [...currentStroke.points, point];
    setCurrentStroke({ ...currentStroke, points: newPoints });
  };

  const endDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    if (currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activeTool === 'text') {
      const point = getPoint(e);
      const id = Date.now().toString();
      const newNode: TextNode = {
        id,
        x: point.x,
        y: point.y,
        content: '',
        color: strokeColor,
        fontSize: 16
      };
      setTextNodes(prev => [...prev, newNode]);
      setActiveTextId(id);
    } else if (activeTool === 'select') {
      setActiveTextId(null);
    }
  };

  const updateTextNode = (id: string, content: string) => {
    setTextNodes(prev => prev.map(node => node.id === id ? { ...node, content } : node));
  };
  
  const deleteTextNode = (id: string) => {
     setTextNodes(prev => prev.filter(node => node.id !== id));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-white cursor-crosshair">
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full touch-none ${activeTool === 'select' ? 'cursor-default' : activeTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        onClick={handleCanvasClick}
      />

      {/* Text Nodes Overlay */}
      {textNodes.map(node => (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            transform: 'translate(0, -50%)', // Center vertically on click point
          }}
        >
          {activeTextId === node.id || !node.content ? (
            <textarea
              autoFocus
              value={node.content}
              onChange={(e) => updateTextNode(node.id, e.target.value)}
              onBlur={() => {
                setActiveTextId(null);
                if (!node.content.trim()) deleteTextNode(node.id);
              }}
              style={{
                color: node.color,
                fontSize: `${node.fontSize}px`,
                minWidth: '100px'
              }}
              className="bg-transparent border-none outline-none resize-none overflow-hidden p-0 m-0 font-sans"
              placeholder="Type..."
              rows={Math.max(1, node.content.split('\n').length)}
            />
          ) : (
            <div
              onClick={(e) => {
                if (activeTool === 'select' || activeTool === 'text') {
                   e.stopPropagation(); // Prevent creating new text node
                   setActiveTextId(node.id);
                }
              }}
              style={{
                color: node.color,
                fontSize: `${node.fontSize}px`,
                cursor: activeTool === 'select' ? 'pointer' : 'default'
              }}
              className="whitespace-pre-wrap select-none hover:bg-gray-50/50 rounded"
            >
              {node.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Canvas;
