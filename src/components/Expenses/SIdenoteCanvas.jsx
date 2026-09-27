import React, { useRef, useState, useEffect, useCallback } from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';
import { GoogleGenAI } from '@google/genai';

export default function SIdenoteCanvas({ onClose, onSave }) {
  const canvasRef = useRef(null);

  // --- ESTADOS DE HERRAMIENTAS Y CONFIGURACIÓN ---
  const [tool, setTool] = useState('pen'); // 'pen' | 'vector' | 'eraser' | 'pan' | 'select' | 'fill' | 'text'
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [fillOpacity, setFillOpacity] = useState(0.6); // Transparencia para el bote de pintura (0.1 a 1.0)
  const [smartShapeEnabled, setSmartShapeEnabled] = useState(true);
  const [paperStyle, setPaperStyle] = useState('grid'); // 'grid' | 'dots' | 'lines' | 'blank'
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showUI, setShowUI] = useState(true); // Modo Inmersivo

  // --- ESTADOS DE POSICIÓN Y ARRASTRE DE VENTANAS FLOTANTES ---
  const [toolbarPos, setToolbarPos] = useState({ x: 16, y: 16 });
  const [layersPos, setLayersPos] = useState({ x: Math.max(16, window.innerWidth - 340), y: 16 });
  const [bottomBarPos, setBottomBarPos] = useState({ x: Math.max(16, Math.floor(window.innerWidth / 2 - 220)), y: Math.max(16, window.innerHeight - 90) });

  const activePanelDrag = useRef(null); // 'toolbar' | 'layers' | 'bottomBar'
  const dragOffset = useRef({ x: 0, y: 0 });

  // --- ARRASTRE DE CAPAS PARA REORDENAR (DRAG & DROP DE CAPAS CON LÁPIZ/TOUCH) ---
  const draggedLayerIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // --- ESTADOS DE TRAZOS E HISTORIAL (UNDO / REDO) ---
  const [strokes, setStrokes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const currentStroke = useRef([]);
  const isDrawing = useRef(false);

  // --- ESTADOS DE EDICIÓN, MOVIMIENTO Y REDIMENSIONAMIENTO ---
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState(null);
  const activeTransform = useRef(null); 

  // --- CONTROL DE LIENZO INFINITO (PAN & ZOOM) ---
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPanPos = useRef({ x: 0, y: 0 });

  // --- ESTADOS DE TEXTO FLOTANTE ---
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [currentTextValue, setCurrentTextValue] = useState('');
  const [editingTextIndex, setEditingTextIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // --- ESTADOS DE INTELIGENCIA ARTIFICIAL (OCR DE TRAZOS) ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiTranscript, setAiTranscript] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // --- MANEJO DE ARRASTRE DE VENTANAS / PANELES ---
  const handleStartPanelDrag = (panelName, e) => {
    e.stopPropagation();
    activePanelDrag.current = panelName;
    const currentPos = panelName === 'toolbar' ? toolbarPos : panelName === 'layers' ? layersPos : bottomBarPos;
    dragOffset.current = {
      x: e.clientX - currentPos.x,
      y: e.clientY - currentPos.y
    };
  };

  const handleWindowPointerMove = (e) => {
    if (!activePanelDrag.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y));

    if (activePanelDrag.current === 'toolbar') {
      setToolbarPos({ x: newX, y: newY });
    } else if (activePanelDrag.current === 'layers') {
      setLayersPos({ x: newX, y: newY });
    } else if (activePanelDrag.current === 'bottomBar') {
      setBottomBarPos({ x: newX, y: newY });
    }
  };

  const handleWindowPointerUp = () => {
    activePanelDrag.current = null;
  };

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [toolbarPos, layersPos, bottomBarPos]);

  // --- REORDENAR CAPAS MEDIANTE ARRASTRE DIRECTO (LÁPIZ / TOUCH / MOUSE) ---
  const handleLayerDragStart = (index) => {
    draggedLayerIndex.current = index;
  };

  const handleLayerDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleLayerDrop = (targetIndex) => {
    const fromIdx = draggedLayerIndex.current;
    if (fromIdx === null || fromIdx === undefined || fromIdx === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    setStrokes(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIdx, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });

    if (selectedStrokeIndex === fromIdx) {
      setSelectedStrokeIndex(targetIndex);
    }

    draggedLayerIndex.current = null;
    setDragOverIndex(null);
  };

  // --- CÁLCULO DE LA CAJA DELIMITADORA (BOUNDING BOX) PARA 10 FORMAS ---
  const getStrokeBoundingBox = (stroke) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (stroke.isText) {
      const charWidth = (stroke.size || 4) * 3.5;
      const fontHeight = (stroke.size || 4) * 4;
      const textLen = (stroke.text || '').length || 1;
      minX = stroke.x; 
      maxX = stroke.x + (textLen * charWidth);
      minY = stroke.y - fontHeight; 
      maxY = stroke.y + 6;
    } else if (stroke.isVector && stroke.nodes) {
      stroke.nodes.forEach(n => {
        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
      });
    } else if (stroke.isShape) {
      const type = stroke.shapeType;
      if (type === 'circle') {
        minX = stroke.cx - stroke.radius; maxX = stroke.cx + stroke.radius;
        minY = stroke.cy - stroke.radius; maxY = stroke.cy + stroke.radius;
      } else if (type === 'rectangle' || type === 'ellipse' || type === 'diamond' || type === 'heart' || type === 'arrow' || type === 'star' || type === 'hexagon') {
        minX = stroke.x; maxX = stroke.x + stroke.width;
        minY = stroke.y; maxY = stroke.y + stroke.height;
      } else if (type === 'line') {
        minX = Math.min(stroke.x1, stroke.x2); maxX = Math.max(stroke.x1, stroke.x2);
        minY = Math.min(stroke.y1, stroke.y2); maxY = Math.max(stroke.y1, stroke.y2);
      } else if (type === 'triangle') {
        minX = Math.min(stroke.x1, stroke.x2, stroke.x3); maxX = Math.max(stroke.x1, stroke.x2, stroke.x3);
        minY = Math.min(stroke.y1, stroke.y2, stroke.y3); maxY = Math.max(stroke.y1, stroke.y2, stroke.y3);
      }
    } else if (stroke.points) {
      stroke.points.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
    }

    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minX, y: minY, width: Math.max(20, maxX - minX), height: Math.max(20, maxY - minY) };
  };

  // --- DIBUJAR FONDO DE PAPEL ---
  const drawPaperBackground = (ctx, width, height, currentScale, currentOffset, style) => {
    if (style === 'blank') return;
    
    const spacing = 40 * currentScale;
    const startX = currentOffset.x % spacing;
    const startY = currentOffset.y % spacing;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1 / currentScale;

    if (style === 'grid' || style === 'dots') {
      for (let x = startX; x < width; x += spacing) {
        for (let y = startY; y < height; y += spacing) {
          const rx = (x - currentOffset.x) / currentScale;
          const ry = (y - currentOffset.y) / currentScale;
          if (style === 'dots') {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(rx - 1, ry - 1, 2, 2);
          } else {
            ctx.beginPath();
            ctx.moveTo(rx, 0); ctx.lineTo(rx, height / currentScale);
            ctx.moveTo(0, ry); ctx.lineTo(width / currentScale, ry);
            ctx.stroke();
          }
        }
      }
    } else if (style === 'lines') {
      for (let y = startY; y < height; y += spacing) {
        const ry = (y - currentOffset.y) / currentScale;
        ctx.beginPath();
        ctx.moveTo(0, ry); ctx.lineTo(width / currentScale, ry);
        ctx.stroke();
      }
    }
  };

  // --- AUXILIARES PARA DIBUJAR 10 FORMAS GEOMÉTRICAS ---
  const drawShapePath = (ctx, stroke) => {
    const type = stroke.shapeType;
    ctx.beginPath();

    if (type === 'circle') {
      ctx.arc(stroke.cx, stroke.cy, stroke.radius, 0, Math.PI * 2);
    } else if (type === 'rectangle') {
      ctx.rect(stroke.x, stroke.y, stroke.width, stroke.height);
    } else if (type === 'ellipse') {
      ctx.ellipse(stroke.x + stroke.width / 2, stroke.y + stroke.height / 2, Math.abs(stroke.width / 2), Math.abs(stroke.height / 2), 0, 0, Math.PI * 2);
    } else if (type === 'line') {
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
    } else if (type === 'triangle') {
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.lineTo(stroke.x3, stroke.y3);
      ctx.closePath();
    } else if (type === 'diamond') {
      const cx = stroke.x + stroke.width / 2;
      const cy = stroke.y + stroke.height / 2;
      ctx.moveTo(cx, stroke.y);
      ctx.lineTo(stroke.x + stroke.width, cy);
      ctx.lineTo(cx, stroke.y + stroke.height);
      ctx.lineTo(stroke.x, cy);
      ctx.closePath();
    } else if (type === 'star') {
      const cx = stroke.x + stroke.width / 2;
      const cy = stroke.y + stroke.height / 2;
      const outerR = Math.min(stroke.width, stroke.height) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (type === 'hexagon') {
      const cx = stroke.x + stroke.width / 2;
      const cy = stroke.y + stroke.height / 2;
      const rx = stroke.width / 2;
      const ry = stroke.height / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (type === 'arrow') {
      const x = stroke.x, y = stroke.y, w = stroke.width, h = stroke.height;
      const arrowHeadWidth = w * 0.35;
      ctx.moveTo(x, y + h * 0.3);
      ctx.lineTo(x + w - arrowHeadWidth, y + h * 0.3);
      ctx.lineTo(x + w - arrowHeadWidth, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - arrowHeadWidth, y + h);
      ctx.lineTo(x + w - arrowHeadWidth, y + h * 0.7);
      ctx.lineTo(x, y + h * 0.7);
      ctx.closePath();
    } else if (type === 'heart') {
      const x = stroke.x, y = stroke.y, w = stroke.width, h = stroke.height;
      ctx.moveTo(x + w / 2, y + h * 0.8);
      ctx.bezierCurveTo(x + w / 2, y + h * 0.7, x, y + h * 0.5, x, y + h * 0.25);
      ctx.bezierCurveTo(x, y, x + w / 2, y, x + w / 2, y + h * 0.25);
      ctx.bezierCurveTo(x + w / 2, y, x + w, y, x + w, y + h * 0.25);
      ctx.bezierCurveTo(x + w, y + h * 0.5, x + w / 2, y + h * 0.7, x + w / 2, y + h * 0.8);
      ctx.closePath();
    }
  };

  // 🌟 RENDERIZADO DEL LIENZO
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FEF8E7'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    drawPaperBackground(ctx, canvas.width, canvas.height, scale, offset, paperStyle);

    strokes.forEach((stroke, strokeIndex) => {
      if (stroke.hidden) return;

      const isSelected = strokeIndex === selectedStrokeIndex;

      if (stroke.isText) {
        ctx.font = `bold ${(stroke.size || 4) * 3.5}px monospace`;
        ctx.fillStyle = stroke.color || brushColor;
        ctx.fillText(stroke.text, stroke.x, stroke.y);
      } else {
        if (!stroke.isVector && !stroke.isShape && (!stroke.points || stroke.points.length === 0)) return;

        if (stroke.isShape) {
          drawShapePath(ctx, stroke);
        } else if (stroke.isVector) {
          ctx.beginPath();
          const nodes = stroke.nodes;
          if (nodes && nodes.length > 0) {
            ctx.moveTo(nodes[0].x, nodes[0].y);
            for (let i = 1; i < nodes.length; i++) {
              const prev = nodes[i - 1];
              const curr = nodes[i];
              ctx.bezierCurveTo(
                prev.handleOut.x, prev.handleOut.y,
                curr.handleIn.x, curr.handleIn.y,
                curr.x, curr.y
              );
            }
            ctx.closePath();
          }
        } else {
          ctx.beginPath();
          const pts = stroke.points;
          if (pts && pts.length > 0) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
              const xc = (pts[i].x + pts[i + 1].x) / 2;
              const yc = (pts[i].y + pts[i + 1].y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            if (pts.length > 1) {
              ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            }
          }
        }

        // Bote de pintura con grado de transparencia
        if (stroke.fillColor) {
          ctx.save();
          ctx.globalAlpha = stroke.fillOpacity !== undefined ? stroke.fillOpacity : 0.6;
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
          ctx.restore();
        }

        ctx.strokeStyle = stroke.color || brushColor;
        ctx.lineWidth = stroke.size || brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Bounding Box para elementos seleccionados
      if (isSelected && !stroke.locked) {
        const box = getStrokeBoundingBox(stroke);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1.5 / scale;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x - 4, box.y - 4, box.width + 8, box.height + 8);
        ctx.setLineDash([]);

        const handleSize = 8 / scale;
        const corners = [
          { x: box.x - 4, y: box.y - 4 },
          { x: box.x + box.width + 4, y: box.y - 4 },
          { x: box.x - 4, y: box.y + box.height + 4 },
          { x: box.x + box.width + 4, y: box.y + box.height + 4 }
        ];

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2 / scale;
        corners.forEach(c => {
          ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
        });
      }
    });

    ctx.restore();
  }, [strokes, selectedStrokeIndex, scale, offset, paperStyle, brushColor, brushSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawCanvas();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, selectedStrokeIndex, scale, offset, paperStyle, redrawCanvas]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
      pressure: e.pressure > 0 ? e.pressure : 0.5
    };
  };

  const detectSmartShape = (points) => {
    if (!smartShapeEnabled || points.length < 8) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const distanceStartEnd = Math.hypot(end.x - start.x, end.y - start.y);

    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;
    points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const avgRadius = (width + height) / 4;

    if (distanceStartEnd < 50 && width > 30 && height > 30) {
      const isCircular = points.every(p => Math.abs(Math.hypot(p.x - cx, p.y - cy) - avgRadius) < avgRadius * 0.4);
      if (isCircular) return { isShape: true, shapeType: 'circle', cx, cy, radius: avgRadius };
    }

    if (distanceStartEnd < 60 && width > 40 && height > 40) {
      return { isShape: true, shapeType: 'rectangle', x: minX, y: minY, width, height };
    }

    if (distanceStartEnd > 40) {
      let maxDeviation = 0;
      const x1 = start.x, y1 = start.y;
      const x2 = end.x, y2 = end.y;

      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const numerator = Math.abs((y2 - y1) * p.x - (x2 - x1) * p.y + x2 * y1 - y2 * x1);
        const deviation = numerator / distanceStartEnd;
        maxDeviation = Math.max(maxDeviation, deviation);
      }

      if (maxDeviation < 12) {
        return { isShape: true, shapeType: 'line', x1, y1, x2, y2 };
      }
    }

    return null;
  };

  const convertToVectorStroke = (points, color, size) => {
    if (points.length < 3) return null;
    const step = Math.max(1, Math.floor(points.length / 4));
    const nodes = [];

    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      nodes.push({
        x: p.x, y: p.y,
        handleIn: { x: p.x - 20, y: p.y },
        handleOut: { x: p.x + 20, y: p.y }
      });
    }
    const last = points[points.length - 1];
    nodes.push({
      x: last.x, y: last.y,
      handleIn: { x: last.x - 20, y: last.y },
      handleOut: { x: last.x + 20, y: last.y }
    });

    return { isVector: true, nodes, color, size };
  };

  // 🌟 INSERTAR CUALQUIERA DE LAS 10 FORMAS GEOMÉTRICAS EDITABLES
  const insertPresetShape = (shapeType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = (canvas.width / 2 - offset.x) / scale;
    const cy = (canvas.height / 2 - offset.y) / scale;

    let newShape = null;
    if (shapeType === 'circle') {
      newShape = { isShape: true, shapeType: 'circle', cx, cy, radius: 50, color: brushColor, size: brushSize };
    } else if (shapeType === 'rectangle') {
      newShape = { isShape: true, shapeType: 'rectangle', x: cx - 60, y: cy - 40, width: 120, height: 80, color: brushColor, size: brushSize };
    } else if (shapeType === 'ellipse') {
      newShape = { isShape: true, shapeType: 'ellipse', x: cx - 60, y: cy - 40, width: 120, height: 80, color: brushColor, size: brushSize };
    } else if (shapeType === 'line') {
      newShape = { isShape: true, shapeType: 'line', x1: cx - 60, y1: cy, x2: cx + 60, y2: cy, color: brushColor, size: brushSize };
    } else if (shapeType === 'triangle') {
      newShape = { isShape: true, shapeType: 'triangle', x1: cx, y1: cy - 50, x2: cx - 60, y2: cy + 50, x3: cx + 60, y3: cy + 50, color: brushColor, size: brushSize };
    } else if (shapeType === 'diamond') {
      newShape = { isShape: true, shapeType: 'diamond', x: cx - 50, y: cy - 50, width: 100, height: 100, color: brushColor, size: brushSize };
    } else if (shapeType === 'star') {
      newShape = { isShape: true, shapeType: 'star', x: cx - 50, y: cy - 50, width: 100, height: 100, color: brushColor, size: brushSize };
    } else if (shapeType === 'hexagon') {
      newShape = { isShape: true, shapeType: 'hexagon', x: cx - 50, y: cy - 50, width: 100, height: 100, color: brushColor, size: brushSize };
    } else if (shapeType === 'arrow') {
      newShape = { isShape: true, shapeType: 'arrow', x: cx - 60, y: cy - 30, width: 120, height: 60, color: brushColor, size: brushSize };
    } else if (shapeType === 'heart') {
      newShape = { isShape: true, shapeType: 'heart', x: cx - 50, y: cy - 50, width: 100, height: 100, color: brushColor, size: brushSize };
    }

    if (newShape) {
      const namedShape = {
        ...newShape,
        id: Date.now() + Math.random(),
        name: `Forma: ${shapeType.toUpperCase()}`,
        hidden: false,
        locked: false
      };
      setStrokes(prev => [...prev, namedShape]);
      setRedoStack([]);
      setSelectedStrokeIndex(strokes.length);
    }
  };

  // SUBMIT DE TEXTO (TECLADO O VOZ)
  const handleAddTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (!currentTextValue.trim()) {
      setTextModalOpen(false);
      setEditingTextIndex(null);
      return;
    }

    const textVal = aMayusculas(currentTextValue);

    if (editingTextIndex !== null && strokes[editingTextIndex]) {
      setStrokes(prev => {
        const updated = [...prev];
        updated[editingTextIndex] = {
          ...updated[editingTextIndex],
          text: textVal,
          color: brushColor,
          size: brushSize,
          name: `Texto: "${textVal.substring(0, 10)}..."`
        };
        return updated;
      });
      setSelectedStrokeIndex(editingTextIndex);
    } else {
      const newTextObj = {
        isText: true,
        text: textVal,
        x: textInputPosition.x,
        y: textInputPosition.y,
        color: brushColor,
        size: brushSize,
        id: Date.now() + Math.random(),
        name: `Texto: "${textVal.substring(0, 10)}..."`,
        hidden: false,
        locked: false
      };
      setStrokes(prev => [...prev, newTextObj]);
      setSelectedStrokeIndex(strokes.length);
      setRedoStack([]);
    }

    setCurrentTextValue('');
    setEditingTextIndex(null);
    setTextModalOpen(false);
  };

  // DICTADO POR VOZ
  const startVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setCurrentTextValue(prev => (prev ? prev + ' ' + speechToText : speechToText));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // --- MANEJADORES DE CAPAS ---
  const toggleLayerVisibility = (index, e) => {
    e.stopPropagation();
    setStrokes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], hidden: !updated[index].hidden };
      return updated;
    });
  };

  const toggleLayerLock = (index, e) => {
    e.stopPropagation();
    setStrokes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], locked: !updated[index].locked };
      return updated;
    });
  };

  const duplicateStroke = (index, e) => {
    e.stopPropagation();
    const target = strokes[index];
    if (!target) return;
    const cloned = JSON.parse(JSON.stringify(target));
    cloned.id = Date.now() + Math.random();
    cloned.name = `${target.name || 'Capa'} (Copia)`;
    
    if (cloned.isText) { cloned.x += 20; cloned.y += 20; }
    else if (cloned.isShape) {
      if (cloned.cx) { cloned.cx += 20; cloned.cy += 20; }
      if (cloned.x) { cloned.x += 20; cloned.y += 20; }
    } else if (cloned.points) {
      cloned.points.forEach(p => { p.x += 20; p.y += 20; });
    }

    setStrokes(prev => [...prev, cloned]);
    setSelectedStrokeIndex(strokes.length);
  };

  const deleteStroke = (index, e) => {
    e.stopPropagation();
    setStrokes(prev => prev.filter((_, i) => i !== index));
    if (selectedStrokeIndex === index) setSelectedStrokeIndex(null);
  };

  // --- MANEJADORES DE EVENTOS DE PUNTERO ---
  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    const point = getCanvasPoint(e);

    if (tool !== 'pan') {
      if (selectedStrokeIndex !== null && strokes[selectedStrokeIndex] && !strokes[selectedStrokeIndex].locked) {
        const stroke = strokes[selectedStrokeIndex];
        const box = getStrokeBoundingBox(stroke);

        const handleSize = 12 / scale;
        const corners = [
          { type: 'resize-TL', x: box.x - 4, y: box.y - 4 },
          { type: 'resize-TR', x: box.x + box.width + 4, y: box.y - 4 },
          { type: 'resize-BL', x: box.x - 4, y: box.y + box.height + 4 },
          { type: 'resize-BR', x: box.x + box.width + 4, y: box.y + box.height + 4 }
        ];

        for (const c of corners) {
          if (Math.hypot(c.x - point.x, c.y - point.y) < handleSize) {
            activeTransform.current = {
              type: 'resize',
              strokeIdx: selectedStrokeIndex,
              corner: c.type,
              startX: point.x,
              startY: point.y,
              initialBox: { ...box },
              initialStroke: JSON.parse(JSON.stringify(stroke))
            };
            return;
          }
        }

        if (point.x >= box.x - 8 && point.x <= box.x + box.width + 8 && point.y >= box.y - 8 && point.y <= box.y + box.height + 8) {
          activeTransform.current = {
            type: 'move',
            strokeIdx: selectedStrokeIndex,
            startX: point.x,
            startY: point.y,
            initialStroke: JSON.parse(JSON.stringify(stroke))
          };
          return;
        }
      }

      let foundIndex = null;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].hidden || strokes[i].locked) continue;
        const box = getStrokeBoundingBox(strokes[i]);
        if (point.x >= box.x - 10 && point.x <= box.x + box.width + 10 && point.y >= box.y - 10 && point.y <= box.y + box.height + 10) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== null && !strokes[foundIndex].locked) {
        setSelectedStrokeIndex(foundIndex);
        const stroke = strokes[foundIndex];
        activeTransform.current = {
          type: 'move',
          strokeIdx: foundIndex,
          startX: point.x,
          startY: point.y,
          initialStroke: JSON.parse(JSON.stringify(stroke))
        };
        return;
      }
    }

    if (tool === 'text') {
      let foundIndex = null;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].hidden || strokes[i].locked) continue;
        if (strokes[i].isText) {
          const box = getStrokeBoundingBox(strokes[i]);
          if (point.x >= box.x - 10 && point.x <= box.x + box.width + 10 && point.y >= box.y - 10 && point.y <= box.y + box.height + 10) {
            foundIndex = i;
            break;
          }
        }
      }

      if (foundIndex !== null) {
        const textStroke = strokes[foundIndex];
        setEditingTextIndex(foundIndex);
        setCurrentTextValue(textStroke.text);
        setTextInputPosition({ x: textStroke.x, y: textStroke.y });
        if (textStroke.color) setBrushColor(textStroke.color);
        if (textStroke.size) setBrushSize(textStroke.size);
        setSelectedStrokeIndex(foundIndex);
      } else {
        setEditingTextIndex(null);
        setCurrentTextValue('');
        setTextInputPosition({ x: point.x, y: point.y });
      }
      setTextModalOpen(true);
      return;
    }

    if (tool === 'fill') {
      let foundIndex = null;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].hidden || strokes[i].locked) continue;
        const box = getStrokeBoundingBox(strokes[i]);
        if (point.x >= box.x - 15 && point.x <= box.x + box.width + 15 && point.y >= box.y - 15 && point.y <= box.y + box.height + 15) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex !== null) {
        setStrokes(prev => {
          const updated = [...prev];
          updated[foundIndex] = {
            ...updated[foundIndex],
            fillColor: brushColor,
            fillOpacity: fillOpacity
          };
          return updated;
        });
        setSelectedStrokeIndex(foundIndex);
      }
      return;
    }

    if (tool === 'pan' || e.button === 1 || (e.pointerType === 'mouse' && e.altKey)) {
      isPanning.current = true;
      startPanPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    setSelectedStrokeIndex(null);
    isDrawing.current = true;
    currentStroke.current = [point];
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);

    if (isPanning.current) {
      setOffset({
        x: e.clientX - startPanPos.current.x,
        y: e.clientY - startPanPos.current.y
      });
      return;
    }

    if (activeTransform.current !== null) {
      const { type, strokeIdx, startX, startY, initialStroke, initialBox, corner } = activeTransform.current;

      setStrokes(prev => {
        const updated = [...prev];
        const stroke = JSON.parse(JSON.stringify(initialStroke));

        if (type === 'move') {
          const dx = point.x - startX;
          const dy = point.y - startY;

          if (stroke.isText) {
            stroke.x += dx; 
            stroke.y += dy;
          } else if (stroke.isVector && stroke.nodes) {
            stroke.nodes.forEach(n => {
              n.x += dx; n.y += dy;
              n.handleIn.x += dx; n.handleIn.y += dy;
              n.handleOut.x += dx; n.handleOut.y += dy;
            });
          } else if (stroke.isShape) {
            const t = stroke.shapeType;
            if (t === 'circle') {
              stroke.cx += dx; stroke.cy += dy;
            } else if (t === 'rectangle' || t === 'ellipse' || t === 'diamond' || t === 'star' || t === 'hexagon' || t === 'arrow' || t === 'heart') {
              stroke.x += dx; stroke.y += dy;
            } else if (t === 'line') {
              stroke.x1 += dx; stroke.y1 += dy;
              stroke.x2 += dx; stroke.y2 += dy;
            } else if (t === 'triangle') {
              stroke.x1 += dx; stroke.y1 += dy;
              stroke.x2 += dx; stroke.y2 += dy;
              stroke.x3 += dx; stroke.y3 += dy;
            }
          } else if (stroke.points) {
            stroke.points.forEach(p => { p.x += dx; p.y += dy; });
          }
        } else if (type === 'resize') {
          const dx = point.x - startX;
          const dy = point.y - startY;
          let newBox = { ...initialBox };

          if (corner === 'resize-BR') {
            newBox.width = Math.max(20, initialBox.width + dx);
            newBox.height = Math.max(20, initialBox.height + dy);
          } else if (corner === 'resize-BL') {
            newBox.width = Math.max(20, initialBox.width - dx);
            newBox.height = Math.max(20, initialBox.height + dy);
            newBox.x = initialBox.x + dx;
          } else if (corner === 'resize-TR') {
            newBox.width = Math.max(20, initialBox.width + dx);
            newBox.height = Math.max(20, initialBox.height - dy);
            newBox.y = initialBox.y + dy;
          } else if (corner === 'resize-TL') {
            newBox.width = Math.max(20, initialBox.width - dx);
            newBox.height = Math.max(20, initialBox.height - dy);
            newBox.x = initialBox.x + dx;
            newBox.y = initialBox.y + dy;
          }

          if (stroke.isShape) {
            const t = stroke.shapeType;
            if (t === 'circle') {
              stroke.radius = Math.max(10, newBox.width / 2);
              stroke.cx = newBox.x + newBox.width / 2;
              stroke.cy = newBox.y + newBox.height / 2;
            } else if (t === 'rectangle' || t === 'ellipse' || t === 'diamond' || t === 'star' || t === 'hexagon' || t === 'arrow' || t === 'heart') {
              stroke.x = newBox.x;
              stroke.y = newBox.y;
              stroke.width = newBox.width;
              stroke.height = newBox.height;
            }
          }
        }

        updated[strokeIdx] = stroke;
        return updated;
      });
      return;
    }

    if (!isDrawing.current) return;
    currentStroke.current.push(point);
    redrawCanvas();
  };

  const handlePointerUp = () => {
    isPanning.current = false;
    activeTransform.current = null;

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.current.length > 0) {
      let newStrokeObj = null;

      if (tool === 'eraser') {
        const pts = currentStroke.current;
        setStrokes(prev => prev.filter(stroke => {
          const box = getStrokeBoundingBox(stroke);
          return !pts.some(p => p.x >= box.x - 10 && p.x <= box.x + box.width + 10 && p.y >= box.y - 10 && p.y <= box.y + box.height + 10);
        }));
        currentStroke.current = [];
        return;
      }

      if (tool === 'vector') {
        newStrokeObj = convertToVectorStroke(currentStroke.current, brushColor, brushSize);
        if (newStrokeObj) {
          newStrokeObj.id = Date.now() + Math.random();
          newStrokeObj.name = `Vectorial (${strokes.length + 1})`;
          newStrokeObj.hidden = false;
          newStrokeObj.locked = false;
        }
      } else {
        const smartShape = detectSmartShape(currentStroke.current);
        if (smartShape) {
          newStrokeObj = {
            ...smartShape,
            id: Date.now() + Math.random(),
            name: `Forma Inteligente (${smartShape.shapeType})`,
            color: brushColor,
            size: brushSize,
            hidden: false,
            locked: false
          };
        } else {
          newStrokeObj = {
            isText: false,
            isVector: false,
            points: [...currentStroke.current],
            color: brushColor,
            size: brushSize,
            id: Date.now() + Math.random(),
            name: `Trazo libre (${strokes.length + 1})`,
            hidden: false,
            locked: false
          };
        }
      }

      if (newStrokeObj) {
        setStrokes(prev => [...prev, newStrokeObj]);
        setRedoStack([]);
      }
    }
    currentStroke.current = [];
  };

  // --- BOTONES DE ACCIÓN (UNDO / REDO / EXPORTAR / IA) ---
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
    setSelectedStrokeIndex(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const item = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, item]);
  };

  const handleClear = () => {
    if (window.confirm("¿Seguro que deseas limpiar todo el lienzo?")) {
      setStrokes([]);
      setRedoStack([]);
      setSelectedStrokeIndex(null);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSelectedStrokeIndex(null);
    setTimeout(() => {
      redrawCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }, 50);
  };

  // --- INTEGRACIÓN GEMINI AI ---
  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setShowAiModal(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          },
          'Analiza este dibujo o notas hechas a mano en la Super Agenda. Transcribe cualquier texto que encuentres, resume los diagramas o notas y ofrece sugerencias útiles estructuradas.'
        ]
      });

      setAiTranscript(response.text || 'No se pudo generar el análisis.');
    } catch (err) {
      console.error("Error analizando con IA:", err);
      setAiTranscript('Error al conectar con la Inteligencia Artificial. Verifica tu clave de API.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FEF8E7] overflow-hidden font-mono select-none">
      
      {/* 🌟 CANVAS PRINCIPAL CON SOPORTE DE PUNTERO MULTIDISPOSITIVO */}
      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* 🌟 BARRA SUPERIOR DE ACCESOS RÁPIDOS Y ESTADOS */}
      {showUI && (
        <div 
          style={{ transform: `translate(${toolbarPos.x}px, ${toolbarPos.y}px)` }}
          className="absolute z-30 bg-white border-4 border-black rounded-2xl p-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center gap-3 cursor-move"
          onPointerDown={(e) => handleStartPanelDrag('toolbar', e)}
        >
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase bg-amber-200 px-2 py-1 rounded-lg border-2 border-black">
              ✏️ S-PEN PRO
            </span>
            <button
              type="button"
              onClick={() => setShowUI(false)}
              className="bg-stone-200 hover:bg-stone-300 border-2 border-black px-2 py-1 rounded-lg text-xs font-black"
              title="Modo Inmersivo (Ocultar Interfaz)"
            >
              👁️ Ocultar UI
            </button>
          </div>

          <div className="h-6 w-0.5 bg-black"></div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handleUndo} className="p-1.5 bg-white hover:bg-stone-100 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Deshacer">↩️</button>
            <button type="button" onClick={handleRedo} className="p-1.5 bg-white hover:bg-stone-100 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Rehacer">↪️</button>
            <button type="button" onClick={handleClear} className="px-2.5 py-1 bg-rose-300 hover:bg-rose-400 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🧹 Limpiar</button>
          </div>

          <div className="h-6 w-0.5 bg-black"></div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-8 h-8 rounded-lg border-2 border-black cursor-pointer bg-white"
              title="Color de Pincel"
            />
            <select
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="border-2 border-black rounded-lg px-2 py-1 text-xs font-black bg-white cursor-pointer"
            >
              <option value={2}>Fino (2px)</option>
              <option value={4}>Normal (4px)</option>
              <option value={8}>Grueso (8px)</option>
              <option value={16}>Marcador (16px)</option>
            </select>
          </div>

          <div className="h-6 w-0.5 bg-black"></div>

          {/* Selector de Papel */}
          <select
            value={paperStyle}
            onChange={(e) => setPaperStyle(e.target.value)}
            className="border-2 border-black rounded-lg px-2 py-1 text-xs font-black bg-amber-100 cursor-pointer"
          >
            <option value="grid">Cuadriculado</option>
            <option value="dots">Punteado</option>
            <option value="lines">Líneas</option>
            <option value="blank">En Blanco</option>
          </select>

          <button
            type="button"
            onClick={analyzeWithAI}
            className="bg-purple-300 hover:bg-purple-400 border-2 border-black px-3 py-1 rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
          >
            ✨ Analizar con IA
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-black text-white hover:bg-stone-800 border-2 border-black px-3 py-1 rounded-lg text-xs font-black cursor-pointer ml-auto"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* 🌟 BOTÓN PARA RESTAURAR UI EN MODO INMERSIVO */}
      {!showUI && (
        <button
          type="button"
          onClick={() => setShowUI(true)}
          className="absolute top-4 left-4 z-40 bg-white border-4 border-black px-4 py-2 rounded-xl text-xs font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
        >
          👁️ Mostrar Interfaz
        </button>
      )}

      {/* 🌟 PANEL DE CAPAS FLOTANTE Y REORDENABLE */}
      {showUI && showLayersPanel && (
        <div
          style={{ transform: `translate(${layersPos.x}px, ${layersPos.y}px)` }}
          className="absolute z-30 bg-white border-4 border-black rounded-2xl p-3 w-72 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 cursor-move"
          onPointerDown={(e) => handleStartPanelDrag('layers', e)}
        >
          <div className="flex justify-between items-center border-b-2 border-black pb-2">
            <h4 className="font-black text-xs uppercase">📚 Capas y Objetos ({strokes.length})</h4>
            <button
              type="button"
              onClick={() => setShowLayersPanel(false)}
              className="text-xs font-black hover:bg-stone-100 px-1.5 py-0.5 rounded border border-black"
            >
              ✕
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {strokes.length === 0 ? (
              <p className="text-[10px] text-stone-500 text-center py-4 font-bold uppercase">No hay elementos en el lienzo</p>
            ) : (
              strokes.map((stroke, index) => (
                <div
                  key={stroke.id || index}
                  draggable
                  onDragStart={() => handleLayerDragStart(index)}
                  onDragOver={(e) => handleLayerDragOver(e, index)}
                  onDrop={() => handleLayerDrop(index)}
                  onClick={() => setSelectedStrokeIndex(index)}
                  className={`flex items-center justify-between p-2 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedStrokeIndex === index 
                      ? 'bg-sky-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-stone-50 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-black text-stone-400">#{index + 1}</span>
                    <span className="text-xs font-black truncate max-w-27.5">{stroke.name || 'Objeto'}</span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleLayerVisibility(index, e)}
                      className="p-1 rounded hover:bg-white text-xs"
                      title={stroke.hidden ? "Mostrar" : "Ocultar"}
                    >
                      {stroke.hidden ? '👁️‍🗨️' : '👁️'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleLayerLock(index, e)}
                      className="p-1 rounded hover:bg-white text-xs"
                      title={stroke.locked ? "Desbloquear" : "Bloquear"}
                    >
                      {stroke.locked ? '🔒' : '🔓'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => duplicateStroke(index, e)}
                      className="p-1 rounded hover:bg-white text-xs"
                      title="Duplicar"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteStroke(index, e)}
                      className="p-1 rounded hover:bg-rose-100 text-xs text-rose-600"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 🌟 BARRA INFERIOR DE HERRAMIENTAS Y 10 FORMAS GEOMÉTRICAS */}
      {showUI && (
        <div
          style={{ transform: `translate(${bottomBarPos.x}px, ${bottomBarPos.y}px)` }}
          className="absolute z-30 bg-white border-4 border-black rounded-2xl p-2.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center gap-2 cursor-move"
          onPointerDown={(e) => handleStartPanelDrag('bottomBar', e)}
        >
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border-2 border-black">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'pen' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Lápiz / Pincel"
            >
              🖊️ Lápiz
            </button>
            <button
              type="button"
              onClick={() => setTool('vector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'vector' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Curvas Vectoriales"
            >
              ✒️ Vector
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'eraser' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Borrador"
            >
              🧹 Borrador
            </button>
            <button
              type="button"
              onClick={() => setTool('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'text' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Herramienta Texto"
            >
              T Text
            </button>
            <button
              type="button"
              onClick={() => setTool('fill')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'fill' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Bote de Pintura"
            >
              🪣 Relleno
            </button>
            <button
              type="button"
              onClick={() => setTool('pan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tool === 'pan' ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'hover:bg-stone-200'}`}
              title="Mover Lienzo (Pan)"
            >
              🖐️ Pan
            </button>
          </div>

          <div className="h-6 w-0.5 bg-black"></div>

          {/* Menú Rápido de 10 Formas Geométricas */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-stone-500">Formas:</span>
            <button type="button" onClick={() => insertPresetShape('circle')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Círculo">⭕</button>
            <button type="button" onClick={() => insertPresetShape('rectangle')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Rectángulo">⬛</button>
            <button type="button" onClick={() => insertPresetShape('triangle')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Triángulo">🔺</button>
            <button type="button" onClick={() => insertPresetShape('diamond')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Rombo">🔷</button>
            <button type="button" onClick={() => insertPresetShape('star')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Estrella">⭐</button>
            <button type="button" onClick={() => insertPresetShape('heart')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Corazón">❤️</button>
            <button type="button" onClick={() => insertPresetShape('arrow')} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-black rounded-lg text-xs font-black" title="Flecha">➡️</button>
          </div>

          <div className="h-6 w-0.5 bg-black"></div>

          {/* Botón de Guardado Final */}
          <button
            type="button"
            onClick={handleSave}
            className="bg-emerald-400 hover:bg-emerald-500 border-3 border-black px-5 py-2 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all ml-auto"
          >
            💾 Guardar Nota
          </button>
        </div>
      )}

      {/* 🌟 MODAL DE TEXTO FLOTANTE CON VOZ Y TECLADO */}
      {textModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddTextSubmit} className="bg-[#FEF8E7] border-4 border-black rounded-3xl p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 font-mono">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-black text-sm uppercase">⌨️ {editingTextIndex !== null ? 'Editar Texto' : 'Escribir Texto'}</h3>
              <button type="button" onClick={() => setTextModalOpen(false)} className="text-xs font-black">✕</button>
            </div>

            <textarea
              value={currentTextValue}
              onChange={(e) => setCurrentTextValue(e.target.value)}
              placeholder="Escribe tu nota o usa el dictado por voz..."
              rows={4}
              className="w-full border-3 border-black rounded-xl p-3 text-xs font-black bg-white focus:outline-none"
              autoFocus
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={startVoiceDictation}
                className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isListening ? 'bg-rose-400 animate-pulse' : 'bg-sky-300 hover:bg-sky-400'}`}
              >
                {isListening ? '🎙️ Escuchando...' : '🎤 Dictar por Voz'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTextModalOpen(false)}
                  className="px-4 py-2 bg-stone-200 border-2 border-black rounded-xl text-xs font-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-400 border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 🌟 MODAL DE ANÁLISIS DE INTELIGENCIA ARTIFICIAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FEF8E7] border-4 border-black rounded-3xl p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 font-mono">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="font-black text-sm uppercase">✨ Análisis de Trazos con Gemini AI</h3>
              <button type="button" onClick={() => setShowAiModal(false)} className="text-xs font-black">✕</button>
            </div>

            <div className="bg-white border-3 border-black rounded-2xl p-4 min-h-37.5 max-h-72 overflow-y-auto text-xs font-bold leading-relaxed">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                  <p className="uppercase text-[10px]">Analizando tu lienzo y notas...</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{aiTranscript}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="bg-black text-white hover:bg-stone-800 border-3 border-black px-6 py-2 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}