'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const MAX_UPLOAD_PHOTOS = 5;
const MAX_TOTAL_PEOPLE = 8;
const MAX_TEXT_LAYERS = 5;
const DESIGN_CANVAS_W = 620;
const DESIGN_CANVAS_H = 780;
const MIN_SELECTION_SIZE = 0.04;
const BACKGROUND_SWATCH_COLLAPSED = 5;
const FONT_SWATCH_COLLAPSED = 5;

type SelectionStatus = 'pending' | 'processing' | 'done' | 'error';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type TextStyleKey =
  | 'varsity'
  | 'impact'
  | 'elegant'
  | 'script'
  | 'classic'
  | 'chrome-3d'
  | 'emboss-3d'
  | 'neon-script';

type SelectionRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  status: SelectionStatus;
  error?: string;
  processedLayerId?: string;
};

type UploadedPhoto = {
  id: string;
  fileName: string;
  objectUrl: string;
  width: number;
  height: number;
  selections: SelectionRect[];
};

type PersonLayer = {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotationDeg: number;
  flipX: boolean;
  cropTopPct: number;
  cropLeftPct: number;
  cropRightPct: number;
};

type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotationDeg: number;
  color: string;
  styleKey: TextStyleKey;
};

type SelectionDraft = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type LayerDragState = {
  pointerId: number;
  layerId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
};

type TextDragState = {
  pointerId: number;
  textId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
};

type LayerPointerEntry = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type LayerGestureState = {
  layerId: string;
  pointers: LayerPointerEntry[];
  baseScale: number;
  baseRotationDeg: number;
  baseDistance: number;
  baseAngleDeg: number;
};

type SelectionGestureState =
  | {
      pointerId: number;
      mode: 'draw';
    }
  | {
      pointerId: number;
      mode: 'move';
      selectionId: string;
      startX: number;
      startY: number;
      baseRect: SelectionRect;
    }
  | {
      pointerId: number;
      mode: 'resize';
      selectionId: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      baseRect: SelectionRect;
    };

type TextStylePreset = {
  key: TextStyleKey;
  label: string;
  sample: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle?: 'normal' | 'italic';
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase';
  textShadow: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rectFromDraft(draft: SelectionDraft): SelectionRect {
  const left = Math.min(draft.startX, draft.currentX);
  const top = Math.min(draft.startY, draft.currentY);
  const right = Math.max(draft.startX, draft.currentX);
  const bottom = Math.max(draft.startY, draft.currentY);
  return {
    id: createId('selection'),
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
    status: 'pending'
  };
}

function draftToRect(draft: SelectionDraft | null): SelectionRect | null {
  if (!draft) return null;
  return rectFromDraft(draft);
}

function findSelectionById(photo: UploadedPhoto, selectionId: string): SelectionRect | null {
  return photo.selections.find((selection) => selection.id === selectionId) ?? null;
}

function resizeSelectionByHandle(input: {
  baseRect: SelectionRect;
  handle: ResizeHandle;
  dx: number;
  dy: number;
}): Pick<SelectionRect, 'x' | 'y' | 'w' | 'h'> {
  const { baseRect, handle, dx, dy } = input;
  let left = baseRect.x;
  let top = baseRect.y;
  let right = baseRect.x + baseRect.w;
  let bottom = baseRect.y + baseRect.h;

  if (handle === 'nw') {
    left = clamp(baseRect.x + dx, 0, right - MIN_SELECTION_SIZE);
    top = clamp(baseRect.y + dy, 0, bottom - MIN_SELECTION_SIZE);
  } else if (handle === 'ne') {
    right = clamp(baseRect.x + baseRect.w + dx, left + MIN_SELECTION_SIZE, 1);
    top = clamp(baseRect.y + dy, 0, bottom - MIN_SELECTION_SIZE);
  } else if (handle === 'sw') {
    left = clamp(baseRect.x + dx, 0, right - MIN_SELECTION_SIZE);
    bottom = clamp(baseRect.y + baseRect.h + dy, top + MIN_SELECTION_SIZE, 1);
  } else {
    right = clamp(baseRect.x + baseRect.w + dx, left + MIN_SELECTION_SIZE, 1);
    bottom = clamp(baseRect.y + baseRect.h + dy, top + MIN_SELECTION_SIZE, 1);
  }

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top
  };
}

const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    key: 'varsity',
    label: 'Varsity Block',
    sample: 'AA',
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadow: '0 2px 0 rgba(0,0,0,0.35), 0 10px 18px rgba(0,0,0,0.28)'
  },
  {
    key: 'impact',
    label: 'Street Bold',
    sample: 'Aa',
    fontFamily: "'Signika', 'Montserrat', ui-sans-serif, system-ui",
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: 'none',
    textShadow: '0 8px 18px rgba(0,0,0,0.25)'
  },
  {
    key: 'elegant',
    label: 'Modern Serif',
    sample: 'Aa',
    fontFamily: "'Prata', Georgia, serif",
    fontWeight: 400,
    letterSpacing: 0.2,
    textTransform: 'none',
    textShadow: '0 6px 16px rgba(0,0,0,0.2)'
  },
  {
    key: 'script',
    label: 'Signature',
    sample: 'Aa',
    fontFamily: "'Great Vibes', 'Allura', cursive",
    fontWeight: 400,
    fontStyle: 'normal',
    letterSpacing: 0.1,
    textTransform: 'none',
    textShadow: '0 10px 22px rgba(0,0,0,0.3)'
  },
  {
    key: 'classic',
    label: 'Timeless',
    sample: 'Aa',
    fontFamily: "'Times New Roman', Georgia, serif",
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'none',
    textShadow: '0 6px 14px rgba(0,0,0,0.22)'
  },
  {
    key: 'chrome-3d',
    label: '3D Chrome',
    sample: '3D',
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textShadow:
      '0 1px 0 #f3f4f6, 0 2px 0 #d1d5db, 0 3px 0 #9ca3af, 0 12px 16px rgba(0,0,0,0.4)'
  },
  {
    key: 'emboss-3d',
    label: 'Emboss Serif',
    sample: 'Aa',
    fontFamily: "'Prata', Georgia, serif",
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'none',
    textShadow:
      '0 1px 0 rgba(255,255,255,0.75), 0 2px 0 rgba(210,210,210,0.8), 0 10px 18px rgba(0,0,0,0.35)'
  },
  {
    key: 'neon-script',
    label: 'Neon Script',
    sample: 'Aa',
    fontFamily: "'Great Vibes', 'Allura', cursive",
    fontWeight: 400,
    letterSpacing: 0.2,
    textTransform: 'none',
    textShadow:
      '0 0 6px rgba(255,255,255,0.8), 0 0 14px rgba(124,58,237,0.75), 0 0 22px rgba(124,58,237,0.55)'
  }
];

const BACKGROUND_COLOR_SWATCHES = [
  '#f7f3e8',
  '#c8d8f0',
  '#f3d9c6',
  '#d8e8d0',
  '#4b264f',
  '#0b0b0d',
  '#0f172a',
  '#1f2a44',
  '#2a2f39',
  '#3b2d2a',
  '#25352f',
  '#3a2733',
  '#1c1230',
  '#0b3d2e',
  '#1e293b'
];

const TEXT_COLOR_SWATCHES = [
  '#ffffff',
  '#f8fafc',
  '#111827',
  '#fde68a',
  '#fca5a5',
  '#93c5fd',
  '#86efac',
  '#c4b5fd',
  '#67e8f9',
  '#fb7185',
  '#22d3ee',
  '#38bdf8',
  '#e2e8f0',
  '#eab308',
  '#cbd5e1'
];

function findTextStylePreset(key: TextStyleKey): TextStylePreset {
  return TEXT_STYLE_PRESETS.find((preset) => preset.key === key) ?? TEXT_STYLE_PRESETS[0];
}

async function loadImageMeta(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      });
    };
    img.onerror = () => reject(new Error('Image could not be loaded.'));
    img.src = src;
  });
}

async function cropSelectionToDataUrl(input: { src: string; selection: SelectionRect }): Promise<string> {
  const { src, selection } = input;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not read the selected image region.'));
    element.src = src;
  });
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  const sx = Math.floor(clamp(selection.x, 0, 1) * sourceWidth);
  const sy = Math.floor(clamp(selection.y, 0, 1) * sourceHeight);
  const sw = Math.max(4, Math.floor(clamp(selection.w, 0, 1) * sourceWidth));
  const sh = Math.max(4, Math.floor(clamp(selection.h, 0, 1) * sourceHeight));
  const safeSw = Math.min(sw, sourceWidth - sx);
  const safeSh = Math.min(sh, sourceHeight - sy);

  const canvas = document.createElement('canvas');
  canvas.width = safeSw;
  canvas.height = safeSh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, safeSw, safeSh, 0, 0, safeSw, safeSh);
  return canvas.toDataURL('image/png');
}

function moveLayerInStack(layers: PersonLayer[], id: string, action: 'front' | 'back' | 'forward' | 'backward'): PersonLayer[] {
  const index = layers.findIndex((layer) => layer.id === id);
  if (index === -1) return layers;
  if (action === 'front' && index === layers.length - 1) return layers;
  if (action === 'back' && index === 0) return layers;

  const next = [...layers];
  if (action === 'forward' && index < next.length - 1) {
    const tmp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = tmp;
    return next;
  }
  if (action === 'backward' && index > 0) {
    const tmp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = tmp;
    return next;
  }
  const [picked] = next.splice(index, 1);
  if (action === 'front') {
    next.push(picked);
  } else {
    next.unshift(picked);
  }
  return next;
}

export default function ImageDesignPage() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SelectionDraft | null>(null);
  const [layers, setLayers] = useState<PersonLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<'person' | 'text'>('person');
  const [backgroundColor, setBackgroundColor] = useState('#101217');
  const [backgroundHexInput, setBackgroundHexInput] = useState('#101217');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundExplore, setBackgroundExplore] = useState(false);
  const [textColorExplore, setTextColorExplore] = useState(false);
  const [fontExplore, setFontExplore] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processError, setProcessError] = useState('');
  const [textError, setTextError] = useState('');
  const [backgroundError, setBackgroundError] = useState('');
  const [textColorHexInput, setTextColorHexInput] = useState('#f8fafc');
  const [textColorError, setTextColorError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  type ReplicateHealth = 'operational' | 'degraded' | 'outage' | 'unknown';
  const [replicateHealth, setReplicateHealth] = useState<ReplicateHealth>('unknown');
  const [healthDescription, setHealthDescription] = useState('');
  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState('');
  const [healthChecking, setHealthChecking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const selectionBoardRef = useRef<HTMLDivElement>(null);
  const posterCanvasRef = useRef<HTMLDivElement>(null);
  const layerDragRef = useRef<LayerDragState | null>(null);
  const layerGestureRef = useRef<LayerGestureState | null>(null);
  const textDragRef = useRef<TextDragState | null>(null);
  const selectionGestureRef = useRef<SelectionGestureState | null>(null);
  const draftRef = useRef<SelectionDraft | null>(null);
  const photosRef = useRef<UploadedPhoto[]>([]);
  const backgroundImageUrlRef = useRef('');
  const processingRef = useRef(false);
  const lastBatchKeyRef = useRef('');
  const lastBatchAtRef = useRef(0);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.objectUrl);
      }
    };
  }, []);

  useEffect(() => {
    setBackgroundHexInput(backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    const previous = backgroundImageUrlRef.current;
    if (previous && previous.startsWith('blob:') && previous !== backgroundImageUrl) {
      URL.revokeObjectURL(previous);
    }
    backgroundImageUrlRef.current = backgroundImageUrl;
  }, [backgroundImageUrl]);

  useEffect(() => {
    return () => {
      const current = backgroundImageUrlRef.current;
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activePhotoId) {
      if (photos.length > 0) setActivePhotoId(photos[0].id);
      return;
    }
    const exists = photos.some((photo) => photo.id === activePhotoId);
    if (!exists) {
      setActivePhotoId(photos[0]?.id ?? null);
    }
  }, [activePhotoId, photos]);

  useEffect(() => {
    if (!activeLayerId) return;
    const exists = layers.some((layer) => layer.id === activeLayerId);
    if (!exists) setActiveLayerId(layers[layers.length - 1]?.id ?? null);
  }, [activeLayerId, layers]);

  useEffect(() => {
    if (!activeTextId) return;
    const exists = textLayers.some((layer) => layer.id === activeTextId);
    if (!exists) setActiveTextId(textLayers[textLayers.length - 1]?.id ?? null);
  }, [activeTextId, textLayers]);

  // Auto-switch bottom tab when user selects a person layer
  useEffect(() => {
    if (activeLayerId) setBottomTab('person');
  }, [activeLayerId]);

  // Auto-switch bottom tab when user selects a text layer
  useEffect(() => {
    if (activeTextId) setBottomTab('text');
  }, [activeTextId]);

  const activePhoto = useMemo(() => photos.find((photo) => photo.id === activePhotoId) ?? null, [activePhotoId, photos]);
  const activeSelections = activePhoto?.selections ?? [];
  const pendingSelections = useMemo(
    () =>
      photos.reduce(
        (sum, photo) => sum + photo.selections.filter((selection) => selection.status !== 'done').length,
        0
      ),
    [photos]
  );
  const remainingPhotoSlots = Math.max(0, MAX_UPLOAD_PHOTOS - photos.length);
  const peopleUsage = layers.length + pendingSelections;
  const remainingPeopleSlots = Math.max(0, MAX_TOTAL_PEOPLE - peopleUsage);
  const activeLayer = useMemo(() => layers.find((layer) => layer.id === activeLayerId) ?? null, [activeLayerId, layers]);
  const activeTextLayer = useMemo(
    () => textLayers.find((layer) => layer.id === activeTextId) ?? null,
    [activeTextId, textLayers]
  );
  const visibleBackgroundColors = useMemo(
    () =>
      backgroundExplore
        ? BACKGROUND_COLOR_SWATCHES
        : BACKGROUND_COLOR_SWATCHES.slice(0, BACKGROUND_SWATCH_COLLAPSED),
    [backgroundExplore]
  );
  const visibleTextColors = useMemo(
    () => (textColorExplore ? TEXT_COLOR_SWATCHES : TEXT_COLOR_SWATCHES.slice(0, BACKGROUND_SWATCH_COLLAPSED)),
    [textColorExplore]
  );
  const visibleTextStyles = useMemo(
    () => (fontExplore ? TEXT_STYLE_PRESETS : TEXT_STYLE_PRESETS.slice(0, FONT_SWATCH_COLLAPSED)),
    [fontExplore]
  );
  const activeSelection = useMemo(
    () => (activePhoto && activeSelectionId ? findSelectionById(activePhoto, activeSelectionId) : null),
    [activePhoto, activeSelectionId]
  );
  const processableSelections = useMemo(
    () =>
      photos.reduce(
        (sum, photo) => sum + photo.selections.filter((selection) => selection.status === 'pending').length,
        0
      ),
    [photos]
  );
  const canCheckout = layers.length > 0 || textLayers.length > 0;
  const draftRect = draftToRect(draft);

  useEffect(() => {
    if (!activeTextLayer) return;
    setTextColorHexInput(activeTextLayer.color);
  }, [activeTextLayer?.id, activeTextLayer?.color]);

  useEffect(() => {
    if (!activePhoto) {
      setActiveSelectionId(null);
      return;
    }
    if (!activeSelectionId) return;
    const exists = activePhoto.selections.some((selection) => selection.id === activeSelectionId);
    if (!exists) setActiveSelectionId(null);
  }, [activePhoto, activeSelectionId]);

  const runHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    try {
      const res = await fetch('/api/health/replicate');
      if (!res.ok) {
        setReplicateHealth('unknown');
        return;
      }
      const data = (await res.json()) as { status: ReplicateHealth; description: string; checkedAt: string };
      setReplicateHealth(data.status ?? 'unknown');
      setHealthDescription(data.description ?? '');
      setHealthCheckedAt(data.checkedAt ?? '');
      if (data.status === 'degraded' || data.status === 'outage') {
        setHealthBannerDismissed(false);
      }
    } catch {
      setReplicateHealth('unknown');
    } finally {
      setHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    void runHealthCheck();
    const interval = setInterval(() => { void runHealthCheck(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  const handleUploadFiles = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      setUploadError('');
      setProcessError('');

      const freeSlots = MAX_UPLOAD_PHOTOS - photos.length;
      if (freeSlots <= 0) {
        setUploadError(`You can upload at most ${MAX_UPLOAD_PHOTOS} photos.`);
        return;
      }

      const incoming = Array.from(list);
      const toUse = incoming.slice(0, freeSlots);
      const rejectedByCount = incoming.length - toUse.length;
      const prepared: UploadedPhoto[] = [];
      const localErrors: string[] = [];

      for (const file of toUse) {
        if (!file.type.startsWith('image/')) {
          localErrors.push(`${file.name}: unsupported file type.`);
          continue;
        }
        const objectUrl = URL.createObjectURL(file);
        try {
          const meta = await loadImageMeta(objectUrl);
          prepared.push({
            id: createId('photo'),
            fileName: file.name,
            objectUrl,
            width: meta.width,
            height: meta.height,
            selections: []
          });
        } catch {
          URL.revokeObjectURL(objectUrl);
          localErrors.push(`${file.name}: failed to read image.`);
        }
      }

      if (prepared.length > 0) {
        setPhotos((prev) => [...prev, ...prepared]);
        setActivePhotoId((prev) => prev ?? prepared[0].id);
      }

      if (rejectedByCount > 0) {
        localErrors.push(`Only ${MAX_UPLOAD_PHOTOS} photos are allowed in total.`);
      }

      if (localErrors.length > 0) {
        setUploadError(localErrors.join(' '));
      }
    },
    [photos.length]
  );

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === photoId);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((photo) => photo.id !== photoId);
    });
    setProcessError('');
  }, []);

  const removeSelection = useCallback((photoId: string, selectionId: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id !== photoId ? photo : { ...photo, selections: photo.selections.filter((item) => item.id !== selectionId) }
      )
    );
    setProcessError('');
  }, []);

  const clearAllSelections = useCallback(() => {
    setPhotos((prev) => prev.map((photo) => ({ ...photo, selections: [] })));
    setActiveSelectionId(null);
    setProcessError('');
  }, []);

  const applyBackgroundHex = useCallback((raw: string) => {
    const value = raw.trim();
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value)) {
      setBackgroundError('Enter a valid HEX color, e.g. #0f172a');
      return;
    }
    setBackgroundColor(value);
    setBackgroundImageUrl('');
    setBackgroundError('');
  }, []);

  const applyTextHex = useCallback(
    (raw: string) => {
      if (!activeTextId) return;
      const value = raw.trim();
      if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value)) {
        setTextColorError('Enter a valid HEX color, e.g. #f8fafc');
        return;
      }
      setTextLayers((prev) =>
        prev.map((layer) => (layer.id === activeTextId ? { ...layer, color: value } : layer))
      );
      setTextColorError('');
    },
    [activeTextId]
  );

  const handleBackgroundImageFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setBackgroundError('');
    if (!file.type.startsWith('image/')) {
      setBackgroundError('Background file must be an image.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      await loadImageMeta(objectUrl);
      setBackgroundImageUrl(objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      setBackgroundError('Could not read this background image.');
    }
  }, []);

  const handleSelectionPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!activePhoto) return;
      if (processing) return;
      if (e.button !== 0) return;
      const board = selectionBoardRef.current;
      if (!board) return;
      const bounds = board.getBoundingClientRect();
      const x = clamp((e.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((e.clientY - bounds.top) / bounds.height, 0, 1);

      const target = e.target as HTMLElement;
      const handleEl = target.closest('[data-resize-handle]') as HTMLElement | null;
      const selectionEl = target.closest('[data-selection-id]') as HTMLElement | null;
      const selectedId = handleEl?.dataset.selectionId || selectionEl?.dataset.selectionId || null;
      const selected = selectedId ? findSelectionById(activePhoto, selectedId) : null;

      if (selectedId && selected) {
        setActiveSelectionId(selectedId);
        setProcessError('');

        if (selected.status === 'done' || selected.status === 'processing') {
          setProcessError('Processed selections are locked. Delete and re-select if you need to change area.');
          return;
        }

        if (handleEl && handleEl.dataset.resizeHandle) {
          const handle = handleEl.dataset.resizeHandle as ResizeHandle;
          selectionGestureRef.current = {
            pointerId: e.pointerId,
            mode: 'resize',
            selectionId: selectedId,
            handle,
            startX: x,
            startY: y,
            baseRect: selected
          };
          draftRef.current = null;
          setDraft(null);
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        selectionGestureRef.current = {
          pointerId: e.pointerId,
          mode: 'move',
          selectionId: selectedId,
          startX: x,
          startY: y,
          baseRect: selected
        };
        draftRef.current = null;
        setDraft(null);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      if (peopleUsage >= MAX_TOTAL_PEOPLE) {
        setProcessError(`You can select at most ${MAX_TOTAL_PEOPLE} people in total.`);
        return;
      }

      setDraft({
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
      draftRef.current = {
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      };
      selectionGestureRef.current = {
        pointerId: e.pointerId,
        mode: 'draw'
      };
      setActiveSelectionId(null);
      setProcessError('');
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activePhoto, peopleUsage, processing]
  );

  const handleSelectionPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = selectionGestureRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      const board = selectionBoardRef.current;
      if (!board) return;
      const bounds = board.getBoundingClientRect();
      const x = clamp((e.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((e.clientY - bounds.top) / bounds.height, 0, 1);

      if (gesture.mode === 'draw') {
        const current = draftRef.current;
        if (!current || current.pointerId !== e.pointerId) return;
        const nextDraft: SelectionDraft = { ...current, currentX: x, currentY: y };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        return;
      }

      if (!activePhotoId) return;
      if (gesture.mode === 'move') {
        const dx = x - gesture.startX;
        const dy = y - gesture.startY;
        const nextX = clamp(gesture.baseRect.x + dx, 0, 1 - gesture.baseRect.w);
        const nextY = clamp(gesture.baseRect.y + dy, 0, 1 - gesture.baseRect.h);
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id !== activePhotoId
              ? photo
              : {
                  ...photo,
                  selections: photo.selections.map((selection) =>
                    selection.id !== gesture.selectionId
                      ? selection
                      : { ...selection, x: nextX, y: nextY }
                  )
                }
          )
        );
        return;
      }

      const dx = x - gesture.startX;
      const dy = y - gesture.startY;
      const resized = resizeSelectionByHandle({
        baseRect: gesture.baseRect,
        handle: gesture.handle,
        dx,
        dy
      });
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id !== activePhotoId
            ? photo
            : {
                ...photo,
                selections: photo.selections.map((selection) =>
                  selection.id !== gesture.selectionId
                    ? selection
                    : { ...selection, ...resized }
                )
              }
        )
      );
    },
    [activePhotoId]
  );

  const handleSelectionPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = selectionGestureRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      selectionGestureRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (gesture.mode !== 'draw') {
        draftRef.current = null;
        setDraft(null);
        return;
      }

      const currentDraft = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (!currentDraft || currentDraft.pointerId !== e.pointerId) return;
      const next = rectFromDraft(currentDraft);
      if (next.w < MIN_SELECTION_SIZE || next.h < MIN_SELECTION_SIZE) {
        return;
      }
      let appended = false;
      setPhotos((photoList) =>
        photoList.map((photo) => {
          if (photo.id !== activePhotoId) return photo;
          const currentQueued = photoList.reduce(
            (sum, item) => sum + item.selections.filter((selection) => selection.status !== 'done').length,
            0
          );
          if (layers.length + currentQueued >= MAX_TOTAL_PEOPLE) return photo;
          appended = true;
          return {
            ...photo,
            selections: [
              ...photo.selections,
              {
                ...next,
                status: 'pending',
                error: undefined,
                processedLayerId: undefined
              }
            ]
          };
        })
      );
      if (appended) setActiveSelectionId(next.id);
    },
    [activePhotoId, layers.length]
  );

  const processSelections = useCallback(async () => {
    if (processingRef.current) {
      setProcessError('Processing is already running. Please wait.');
      return;
    }
    setProcessError('');
    setUploadError('');
    const targets = photos.flatMap((photo) =>
      photo.selections
        .map((selection, index) => ({
          photoId: photo.id,
          photoName: photo.fileName,
          objectUrl: photo.objectUrl,
          selection,
          localIndex: index
        }))
        .filter((target) => target.selection.status === 'pending')
    );
    if (targets.length === 0) {
      setProcessError('No pending selections. Draw a new frame or remove done items.');
      return;
    }

    const batchKey = targets
      .map((target) => `${target.photoId}:${target.selection.id}`)
      .sort()
      .join('|');
    const now = Date.now();
    if (lastBatchKeyRef.current === batchKey && now - lastBatchAtRef.current < 2500) {
      setProcessError('Same selection batch was just processed. Please edit selections before retrying.');
      return;
    }

    if (layers.length + targets.length > MAX_TOTAL_PEOPLE) {
      setProcessError(`Total people on poster cannot exceed ${MAX_TOTAL_PEOPLE}.`);
      return;
    }

    processingRef.current = true;
    lastBatchKeyRef.current = batchKey;
    lastBatchAtRef.current = now;
    setProcessingLabel(`Preparing ${targets.length} image${targets.length === 1 ? '' : 's'}...`);
    setProcessing(true);
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        selections: photo.selections.map((selection) => {
          const matched = targets.find(
            (target) => target.photoId === photo.id && target.selection.id === selection.id
          );
          if (!matched) return selection;
          return { ...selection, status: 'processing', error: undefined };
        })
      }))
    );

    try {
      const newLayers: PersonLayer[] = [];
      const failures: string[] = [];
      for (let i = 0; i < targets.length; i += 1) {
        const target = targets[i];
        setProcessingLabel(`Processing Image ${i + 1}/${targets.length}: ${target.photoName}`);
        try {
          const cropped = await cropSelectionToDataUrl({
            src: target.objectUrl,
            selection: target.selection
          });
          const res = await fetch('/api/image/remove-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: cropped })
          });
          if (!res.ok) {
            throw new Error((await res.text()) || `Background removal failed at selection ${i + 1}.`);
          }
          const payload = (await res.json()) as { imageUrl?: string };
          if (!payload?.imageUrl) {
            throw new Error(`No image output returned at selection ${i + 1}.`);
          }
          const meta = await loadImageMeta(payload.imageUrl);
          const baseWidth = 180;
          const baseHeight = Math.max(90, Math.round((meta.height / Math.max(1, meta.width)) * baseWidth));
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = clamp(130 + col * 180, 40, DESIGN_CANVAS_W - 40);
          const y = clamp(150 + row * 190, 40, DESIGN_CANVAS_H - 40);
          const layerId = createId('person');
          newLayers.push({
            id: layerId,
            name: `${target.photoName} #${target.localIndex + 1}`,
            src: payload.imageUrl,
            x,
            y,
            width: baseWidth,
            height: baseHeight,
            scale: 1,
            rotationDeg: 0,
            flipX: false,
            cropTopPct: 0,
            cropLeftPct: 0,
            cropRightPct: 0
          });

          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id !== target.photoId
                ? photo
                : {
                    ...photo,
                    selections: photo.selections.map((selection) =>
                      selection.id !== target.selection.id
                        ? selection
                        : {
                            ...selection,
                            status: 'done',
                            error: undefined,
                            processedLayerId: layerId
                          }
                    )
                  }
            )
          );
        } catch (e: any) {
          const message = e?.message ?? 'Processing failed';
          failures.push(`${target.photoName} #${target.localIndex + 1}: ${message}`);
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id !== target.photoId
                ? photo
                : {
                    ...photo,
                    selections: photo.selections.map((selection) =>
                      selection.id !== target.selection.id
                        ? selection
                        : {
                            ...selection,
                            status: 'error',
                            error: message
                          }
                    )
                  }
            )
          );
        }
      }

      if (newLayers.length > 0) {
        setLayers((prev) => [...prev, ...newLayers]);
        setActiveLayerId(newLayers[newLayers.length - 1]?.id ?? null);
      }
      if (failures.length > 0) {
        setProcessError(`Some selections failed:\n${failures.join('\n')}`);
      }
    } finally {
      setProcessing(false);
      setProcessingLabel('');
      processingRef.current = false;
    }
  }, [layers.length, photos]);

  const handleLayerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, layerId: string) => {
      const layer = layers.find((item) => item.id === layerId);
      const canvas = posterCanvasRef.current;
      if (!layer || !canvas) return;
      setActiveLayerId(layerId);
      e.currentTarget.setPointerCapture(e.pointerId);

      const gesture = layerGestureRef.current;
      const newEntry: LayerPointerEntry = { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };

      if (!gesture || gesture.layerId !== layerId) {
        layerGestureRef.current = {
          layerId,
          pointers: [newEntry],
          baseScale: layer.scale,
          baseRotationDeg: layer.rotationDeg,
          baseDistance: 0,
          baseAngleDeg: 0
        };
        layerDragRef.current = {
          pointerId: e.pointerId,
          layerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          originX: layer.x,
          originY: layer.y
        };
      } else if (gesture.pointers.length === 1) {
        const existing = gesture.pointers[0];
        const dx = e.clientX - existing.clientX;
        const dy = e.clientY - existing.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
        layerGestureRef.current = {
          layerId,
          pointers: [existing, newEntry],
          baseScale: layer.scale,
          baseRotationDeg: layer.rotationDeg,
          baseDistance: distance,
          baseAngleDeg: angleDeg
        };
        layerDragRef.current = null;
      }
    },
    [layers]
  );

  const handleLayerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, layerId: string) => {
      const gesture = layerGestureRef.current;
      const canvas = posterCanvasRef.current;
      if (!gesture || gesture.layerId !== layerId || !canvas) return;

      const updatedPointers = gesture.pointers.map((p) =>
        p.pointerId === e.pointerId ? { ...p, clientX: e.clientX, clientY: e.clientY } : p
      );

      if (gesture.pointers.length === 2) {
        const [p1, p2] = updatedPointers;
        const dx = p2.clientX - p1.clientX;
        const dy = p2.clientY - p1.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const currentAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

        const scaleFactor = gesture.baseDistance > 0 ? currentDistance / gesture.baseDistance : 1;
        const newScale = clamp(gesture.baseScale * scaleFactor, 0.15, 4.0);
        const deltaAngle = currentAngleDeg - gesture.baseAngleDeg;
        const newRotation = gesture.baseRotationDeg + deltaAngle;

        layerGestureRef.current = { ...gesture, pointers: updatedPointers };
        setLayers((prev) =>
          prev.map((layer) =>
            layer.id !== layerId ? layer : { ...layer, scale: newScale, rotationDeg: newRotation }
          )
        );
      } else if (gesture.pointers.length === 1) {
        const drag = layerDragRef.current;
        if (!drag || drag.pointerId !== e.pointerId || drag.layerId !== layerId) return;
        const bounds = canvas.getBoundingClientRect();
        const dx = ((e.clientX - drag.startClientX) / bounds.width) * DESIGN_CANVAS_W;
        const dy = ((e.clientY - drag.startClientY) / bounds.height) * DESIGN_CANVAS_H;
        layerGestureRef.current = { ...gesture, pointers: updatedPointers };
        setLayers((prev) =>
          prev.map((layer) =>
            layer.id !== layerId
              ? layer
              : { ...layer, x: clamp(drag.originX + dx, 0, DESIGN_CANVAS_W), y: clamp(drag.originY + dy, 0, DESIGN_CANVAS_H) }
          )
        );
      }
    },
    []
  );

  const handleLayerPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, layerId: string) => {
      const gesture = layerGestureRef.current;
      if (gesture && gesture.layerId === layerId) {
        const remaining = gesture.pointers.filter((p) => p.pointerId !== e.pointerId);
        if (remaining.length === 0) {
          layerGestureRef.current = null;
          layerDragRef.current = null;
        } else {
          const layer = layers.find((l) => l.id === layerId);
          if (layer) {
            const [p] = remaining;
            layerGestureRef.current = {
              layerId,
              pointers: remaining,
              baseScale: layer.scale,
              baseRotationDeg: layer.rotationDeg,
              baseDistance: 0,
              baseAngleDeg: 0
            };
            layerDragRef.current = {
              pointerId: p.pointerId,
              layerId,
              startClientX: p.clientX,
              startClientY: p.clientY,
              originX: layer.x,
              originY: layer.y
            };
          }
        }
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [layers]
  );

  const addTextLayer = useCallback(() => {
    setTextError('');
    if (textLayers.length >= MAX_TEXT_LAYERS) {
      setTextError(`You can add at most ${MAX_TEXT_LAYERS} text layers.`);
      return;
    }
    const next: TextLayer = {
      id: createId('text'),
      text: `Text ${textLayers.length + 1}`,
      x: DESIGN_CANVAS_W / 2,
      y: 120 + textLayers.length * 68,
      fontSize: 64,
      rotationDeg: 0,
      color: '#f8fafc',
      styleKey: textLayers.length % 2 === 0 ? 'varsity' : 'script'
    };
    setTextLayers((prev) => [...prev, next]);
    setActiveTextId(next.id);
  }, [textLayers]);

  const updateActiveTextLayer = useCallback(
    (patch: Partial<TextLayer>) => {
      if (!activeTextId) return;
      setTextLayers((prev) =>
        prev.map((layer) => (layer.id === activeTextId ? { ...layer, ...patch } : layer))
      );
    },
    [activeTextId]
  );

  const removeActiveTextLayer = useCallback(() => {
    if (!activeTextId) return;
    setTextLayers((prev) => prev.filter((layer) => layer.id !== activeTextId));
  }, [activeTextId]);

  const handleTextPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, textId: string) => {
      if (e.button !== 0) return;
      const layer = textLayers.find((item) => item.id === textId);
      const canvas = posterCanvasRef.current;
      if (!layer || !canvas) return;
      setActiveTextId(textId);
      textDragRef.current = {
        pointerId: e.pointerId,
        textId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: layer.x,
        originY: layer.y
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [textLayers]
  );

  const handleTextPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>, textId: string) => {
    const drag = textDragRef.current;
    const canvas = posterCanvasRef.current;
    if (!drag || drag.pointerId !== e.pointerId || drag.textId !== textId || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const dx = ((e.clientX - drag.startClientX) / bounds.width) * DESIGN_CANVAS_W;
    const dy = ((e.clientY - drag.startClientY) / bounds.height) * DESIGN_CANVAS_H;
    setTextLayers((prev) =>
      prev.map((layer) =>
        layer.id !== textId
          ? layer
          : {
              ...layer,
              x: clamp(drag.originX + dx, 0, DESIGN_CANVAS_W),
              y: clamp(drag.originY + dy, 0, DESIGN_CANVAS_H)
            }
      )
    );
  }, []);

  const handleTextPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>, textId: string) => {
    const drag = textDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || drag.textId !== textId) return;
    textDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const updateActiveLayer = useCallback(
    (patch: Partial<PersonLayer>) => {
      if (!activeLayerId) return;
      setLayers((prev) => prev.map((layer) => (layer.id === activeLayerId ? { ...layer, ...patch } : layer)));
    },
    [activeLayerId]
  );

  const moveActiveLayer = useCallback(
    (action: 'front' | 'back' | 'forward' | 'backward') => {
      if (!activeLayerId) return;
      setLayers((prev) => moveLayerInStack(prev, activeLayerId, action));
    },
    [activeLayerId]
  );

  const removeActiveLayer = useCallback(() => {
    if (!activeLayerId) return;
    setLayers((prev) => prev.filter((layer) => layer.id !== activeLayerId));
  }, [activeLayerId]);

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <rect x="2.5" y="2.5" width="37" height="37" rx="9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.58)" />
              <rect x="9.5" y="10" width="23" height="16" rx="3.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
              <circle cx="26.5" cy="15.5" r="2.4" fill="rgba(255,255,255,0.9)" />
              <path d="M11.5 29.2L18.2 22.2L22.3 26.5L25.2 23.8L30.5 29.2" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brandText">
            <div className="brandMain">IMAGE</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <div className="healthBadge" aria-label={`AI Service status: ${replicateHealth}`}>
          <span className={`healthDot health-${replicateHealth}`} aria-hidden="true" />
          <span className="healthLabel">
            {replicateHealth === 'operational' && 'AI: Online'}
            {replicateHealth === 'degraded' && 'AI: Degraded'}
            {replicateHealth === 'outage' && 'AI: Down'}
            {replicateHealth === 'unknown' && 'AI: Checking…'}
          </span>
        </div>
      </header>

      <main className="layout">
        {(replicateHealth === 'degraded' || replicateHealth === 'outage') && !healthBannerDismissed && (
          <div className={`healthBanner health-banner-${replicateHealth}`} role="alert">
            <span>
              {replicateHealth === 'outage'
                ? '🔴 Background removal is currently unavailable (Replicate is down). Please try again later.'
                : '🟡 Background removal may be slow or unreliable right now. Replicate is experiencing issues.'}
              {healthDescription ? ` — ${healthDescription}` : ''}
            </span>
            <button
              type="button"
              className="healthBannerClose"
              aria-label="Dismiss"
              onClick={() => setHealthBannerDismissed(true)}
            >
              ✕
            </button>
          </div>
        )}
        <section className="previewPanel">
          <div className="previewHeader">
            <h2>Poster Area</h2>
            <p>Drag extracted people. Use layer controls from the right panel.</p>
          </div>
          <div className="posterWrap">
            <div
              ref={posterCanvasRef}
              className="posterCanvas"
              style={{
                backgroundColor,
                backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none'
              }}
            >
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`personLayer ${activeLayerId === layer.id ? 'active' : ''}`}
                  style={{
                    left: `${(layer.x / DESIGN_CANVAS_W) * 100}%`,
                    top: `${(layer.y / DESIGN_CANVAS_H) * 100}%`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    zIndex: index + 1,
                    transform: `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotationDeg}deg) scaleX(${layer.flipX ? -1 : 1})`,
                    touchAction: 'none' as const
                  }}
                  onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
                  onPointerMove={(e) => handleLayerPointerMove(e, layer.id)}
                  onPointerUp={(e) => handleLayerPointerUp(e, layer.id)}
                  onPointerCancel={(e) => handleLayerPointerUp(e, layer.id)}
                >
                  <img
                    src={layer.src}
                    alt={layer.name}
                    draggable={false}
                    style={{
                      clipPath: `inset(${layer.cropTopPct}% ${layer.cropRightPct}% 0% ${layer.cropLeftPct}%)`
                    }}
                  />
                  {activeLayerId === layer.id && (
                    <div
                      className="layerControls"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="layerControlBtn"
                        aria-label="Rotate counter-clockwise"
                        onClick={(e) => { e.stopPropagation(); updateActiveLayer({ rotationDeg: layer.rotationDeg - 15 }); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5.5A5 5 0 1 1 3.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 2.5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        type="button"
                        className="layerControlBtn"
                        aria-label="Zoom out"
                        onClick={(e) => { e.stopPropagation(); updateActiveLayer({ scale: Math.max(0.15, layer.scale - 0.1) }); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        type="button"
                        className="layerControlBtn"
                        aria-label="Zoom in"
                        onClick={(e) => { e.stopPropagation(); updateActiveLayer({ scale: Math.min(4.0, layer.scale + 0.1) }); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        type="button"
                        className={`layerControlBtn${layer.flipX ? ' layerControlBtnActive' : ''}`}
                        aria-label="Mirror horizontal"
                        onClick={(e) => { e.stopPropagation(); updateActiveLayer({ flipX: !layer.flipX }); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 4.5l3 2.5-3 2.5M12 4.5l-3 2.5 3 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        type="button"
                        className="layerControlBtn"
                        aria-label="Rotate clockwise"
                        onClick={(e) => { e.stopPropagation(); updateActiveLayer({ rotationDeg: layer.rotationDeg + 15 }); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 5.5A5 5 0 1 0 10.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 2.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {textLayers.map((layer, index) => {
                const stylePreset = findTextStylePreset(layer.styleKey);
                return (
                  <div
                    key={layer.id}
                    className={`textLayer ${activeTextId === layer.id ? 'active' : ''}`}
                    style={{
                      left: `${(layer.x / DESIGN_CANVAS_W) * 100}%`,
                      top: `${(layer.y / DESIGN_CANVAS_H) * 100}%`,
                      zIndex: layers.length + index + 20,
                      color: layer.color,
                      fontSize: `${layer.fontSize}px`,
                      fontFamily: stylePreset.fontFamily,
                      fontWeight: stylePreset.fontWeight,
                      fontStyle: stylePreset.fontStyle ?? 'normal',
                      letterSpacing: `${stylePreset.letterSpacing}px`,
                      textTransform: stylePreset.textTransform ?? 'none',
                      textShadow: stylePreset.textShadow,
                      transform: `translate(-50%, -50%) rotate(${layer.rotationDeg}deg)`
                    }}
                    onPointerDown={(e) => handleTextPointerDown(e, layer.id)}
                    onPointerMove={(e) => handleTextPointerMove(e, layer.id)}
                    onPointerUp={(e) => handleTextPointerUp(e, layer.id)}
                    onPointerCancel={(e) => handleTextPointerUp(e, layer.id)}
                  >
                    {layer.text || 'Text'}
                    {activeTextId === layer.id && (
                      <div
                        className="layerControls"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button type="button" className="layerControlBtn" aria-label="Rotate counter-clockwise"
                          onClick={(e) => { e.stopPropagation(); updateActiveTextLayer({ rotationDeg: layer.rotationDeg - 15 }); }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5.5A5 5 0 1 1 3.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 2.5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button type="button" className="layerControlBtn" aria-label="Decrease size"
                          onClick={(e) => { e.stopPropagation(); updateActiveTextLayer({ fontSize: Math.max(20, layer.fontSize - 8) }); }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                        <button type="button" className="layerControlBtn" aria-label="Increase size"
                          onClick={(e) => { e.stopPropagation(); updateActiveTextLayer({ fontSize: Math.min(190, layer.fontSize + 8) }); }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                        <button type="button" className="layerControlBtn" aria-label="Rotate clockwise"
                          onClick={(e) => { e.stopPropagation(); updateActiveTextLayer({ rotationDeg: layer.rotationDeg + 15 }); }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 5.5A5 5 0 1 0 10.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 2.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {layers.length === 0 && textLayers.length === 0 ? (
                <div className="posterEmpty">No people yet. Select and process people from uploaded photos.</div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="bottomPanel">
            <div className="bottomTabStrip">
              <button
                type="button"
                className={`bottomTab ${bottomTab === 'person' ? 'active' : ''}`}
                onClick={() => setBottomTab('person')}
              >
                Person Layer
              </button>
              <button
                type="button"
                className={`bottomTab ${bottomTab === 'text' ? 'active' : ''}`}
                onClick={() => setBottomTab('text')}
              >
                Text Designer
              </button>
            </div>

            {bottomTab === 'person' && (
              <div className="bottomTabContent">
                {!activeLayer && (
                  <p className="hint">Select a person layer on the canvas to edit. Pinch to zoom · Two-finger rotate.</p>
                )}

                <div className="buttonGrid">
                  <button type="button" className="ghostBtn" disabled={!activeLayerId} onClick={() => moveActiveLayer('front')}>
                    To Front
                  </button>
                  <button type="button" className="ghostBtn" disabled={!activeLayerId} onClick={() => moveActiveLayer('back')}>
                    To Back
                  </button>
                  <button type="button" className="ghostBtn" disabled={!activeLayerId} onClick={() => moveActiveLayer('forward')}>
                    Forward
                  </button>
                  <button type="button" className="ghostBtn" disabled={!activeLayerId} onClick={() => moveActiveLayer('backward')}>
                    Backward
                  </button>
                </div>

                <div className="buttonRow">
                  <button type="button" className="dangerBtn" disabled={!activeLayerId} onClick={removeActiveLayer}>
                    Delete Image
                  </button>
                </div>

                {layers.length > 0 ? (
                  <div className="layerList">
                    {layers.map((layer, index) => (
                      <button
                        key={layer.id}
                        type="button"
                        className={`layerItem ${layer.id === activeLayerId ? 'active' : ''}`}
                        onClick={() => setActiveLayerId(layer.id)}
                      >
                        <span>#{index + 1}</span>
                        <span>{layer.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {bottomTab === 'text' && (
              <div className="bottomTabContent">
                <div className="buttonRow">
                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={addTextLayer}
                    disabled={textLayers.length >= MAX_TEXT_LAYERS}
                  >
                    Add Text Layer
                  </button>
                  <button
                    type="button"
                    className="dangerBtn"
                    onClick={removeActiveTextLayer}
                    disabled={!activeTextId}
                  >
                    Remove
                  </button>
                  <span className="countBadge">
                    {textLayers.length}/{MAX_TEXT_LAYERS}
                  </span>
                </div>
                {textError ? <p className="error">{textError}</p> : null}

                {activeTextLayer ? (
                  <>
                    <div className="field">
                      <label>Text Content</label>
                      <textarea
                        className="textInput"
                        rows={2}
                        value={activeTextLayer.text}
                        onChange={(e) => updateActiveTextLayer({ text: e.target.value })}
                        placeholder="Enter your text"
                      />
                    </div>

                    <div className="field">
                      <div className="fieldLabelRow">
                        <label>Choose Font</label>
                        <button
                          type="button"
                          className="exploreBtn"
                          onClick={() => setFontExplore((prev) => !prev)}
                        >
                          <span className={`expandGlyph ${fontExplore ? 'open' : ''}`} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <span />
                          </span>
                          <span>{fontExplore ? 'Compact' : 'Explore'}</span>
                        </button>
                      </div>
                      <div className={`fontPresetGrid ${fontExplore ? 'expanded' : 'compact'}`}>
                        {visibleTextStyles.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            className={`fontPresetCard ${activeTextLayer.styleKey === preset.key ? 'active' : ''}`}
                            onClick={() => updateActiveTextLayer({ styleKey: preset.key })}
                          >
                            <span
                              className="fontPreview"
                              style={{
                                fontFamily: preset.fontFamily,
                                fontWeight: preset.fontWeight,
                                fontStyle: preset.fontStyle ?? 'normal',
                                letterSpacing: `${preset.letterSpacing}px`,
                                textTransform: preset.textTransform ?? 'none',
                                textShadow: preset.textShadow
                              }}
                            >
                              {preset.sample}
                            </span>
                            <span className="fontLabel">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <div className="fieldLabelRow">
                        <label>Text Color</label>
                        <button
                          type="button"
                          className="exploreBtn"
                          onClick={() => setTextColorExplore((prev) => !prev)}
                        >
                          <span className={`expandGlyph ${textColorExplore ? 'open' : ''}`} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <span />
                          </span>
                          <span>{textColorExplore ? 'Compact' : 'Explore'}</span>
                        </button>
                      </div>
                      <div className={`swatchGrid ${textColorExplore ? 'expanded' : 'compact'}`}>
                        {visibleTextColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`colorSwatchBtn ${activeTextLayer.color.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                            onClick={() => {
                              updateActiveTextLayer({ color });
                              setTextColorError('');
                            }}
                            title={color}
                          >
                            <span className="colorSwatchDot" style={{ background: color }} />
                          </button>
                        ))}
                      </div>
                      <div className="hexRow">
                        <input
                          type="color"
                          value={activeTextLayer.color}
                          onChange={(e) => {
                            updateActiveTextLayer({ color: e.target.value });
                            setTextColorError('');
                          }}
                        />
                        <input
                          type="text"
                          value={textColorHexInput}
                          onChange={(e) => setTextColorHexInput(e.target.value)}
                          onBlur={() => applyTextHex(textColorHexInput)}
                          className="hexInput"
                          placeholder="#f8fafc"
                        />
                        <button type="button" className="ghostBtn" onClick={() => applyTextHex(textColorHexInput)}>
                          Apply
                        </button>
                      </div>
                      {textColorError ? <p className="error">{textColorError}</p> : null}
                    </div>

                  </>
                ) : (
                  <p className="hint">Add a text layer, then drag it onto the canvas.</p>
                )}

                {textLayers.length > 0 ? (
                  <div className="layerList">
                    {textLayers.map((layer, index) => (
                      <button
                        key={layer.id}
                        type="button"
                        className={`layerItem ${layer.id === activeTextId ? 'active' : ''}`}
                        onClick={() => setActiveTextId(layer.id)}
                      >
                        <span>T{index + 1}</span>
                        <span>{layer.text.trim() || `Text ${index + 1}`}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

        <aside className="rightPanel">
          <div className="rightPanelScroll">
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Upload Photos</h3>
                <span>
                  {photos.length}/{MAX_UPLOAD_PHOTOS}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hiddenInput"
                onChange={(e) => {
                  void handleUploadFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              <div className="buttonRow">
                <button
                  type="button"
                  className="primaryBtn"
                  disabled={remainingPhotoSlots <= 0}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {remainingPhotoSlots > 0 ? 'Add Photos' : 'Max Photos Reached'}
                </button>
              </div>
              <p className="hint">Maximum {MAX_UPLOAD_PHOTOS} photos. Draw person frames in next card.</p>
              {uploadError ? <p className="error">{uploadError}</p> : null}
              {photos.length > 0 ? (
                <div className="photoList">
                  {photos.map((photo) => (
                    <div key={photo.id} className={`photoItem ${photo.id === activePhotoId ? 'active' : ''}`}>
                      <button type="button" className="photoSelect" onClick={() => setActivePhotoId(photo.id)}>
                        <span className="photoName">{photo.fileName}</span>
                        <span className="photoMeta">
                          {photo.width}x{photo.height} -{' '}
                          {photo.selections.filter((selection) => selection.status === 'done').length} done /{' '}
                          {photo.selections.filter((selection) => selection.status !== 'done').length} pending
                        </span>
                      </button>
                      <button type="button" className="ghostBtn" onClick={() => removePhoto(photo.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Frame People</h3>
                <span>
                  {peopleUsage}/{MAX_TOTAL_PEOPLE}
                </span>
              </div>
              {activePhoto ? (
                <>
                  <div className="selectionBoardWrap">
                    <div
                      ref={selectionBoardRef}
                      className="selectionBoard"
                      style={{ aspectRatio: `${activePhoto.width} / ${activePhoto.height}` }}
                      onPointerDown={handleSelectionPointerDown}
                      onPointerMove={handleSelectionPointerMove}
                      onPointerUp={handleSelectionPointerUp}
                      onPointerCancel={handleSelectionPointerUp}
                    >
                      <img src={activePhoto.objectUrl} alt={activePhoto.fileName} draggable={false} />
                      {activeSelections.map((selection, index) => (
                        <div
                          key={selection.id}
                          data-selection-id={selection.id}
                          className={`selectionRect ${activeSelectionId === selection.id ? 'active' : ''} status-${selection.status}`}
                          style={{
                            left: `${selection.x * 100}%`,
                            top: `${selection.y * 100}%`,
                            width: `${selection.w * 100}%`,
                            height: `${selection.h * 100}%`
                          }}
                          onPointerDown={() => setActiveSelectionId(selection.id)}
                        >
                          <span className="selectionBadge">
                            #{index + 1} {selection.status}
                          </span>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelection(activePhoto.id, selection.id);
                            }}
                          >
                            x
                          </button>
                          {(selection.status === 'pending' || selection.status === 'error') && (
                            <>
                              <span
                                className="resizeHandle nw"
                                data-selection-id={selection.id}
                                data-resize-handle="nw"
                              />
                              <span
                                className="resizeHandle ne"
                                data-selection-id={selection.id}
                                data-resize-handle="ne"
                              />
                              <span
                                className="resizeHandle sw"
                                data-selection-id={selection.id}
                                data-resize-handle="sw"
                              />
                              <span
                                className="resizeHandle se"
                                data-selection-id={selection.id}
                                data-resize-handle="se"
                              />
                            </>
                          )}
                        </div>
                      ))}
                      {draftRect ? (
                        <div
                          className="selectionRect draft"
                          style={{
                            left: `${draftRect.x * 100}%`,
                            top: `${draftRect.y * 100}%`,
                            width: `${draftRect.w * 100}%`,
                            height: `${draftRect.h * 100}%`
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="buttonRow">
                    <button
                      type="button"
                      className="ghostBtn"
                      onClick={clearAllSelections}
                      disabled={activeSelections.length === 0 || processing}
                    >
                      Clear All Selections
                    </button>
                    <button
                      type="button"
                      className="ghostBtn"
                      disabled={!activePhotoId || !activeSelectionId || processing}
                      onClick={() => {
                        if (!activePhotoId || !activeSelectionId) return;
                        removeSelection(activePhotoId, activeSelectionId);
                      }}
                    >
                      Remove Active
                    </button>
                  </div>
                  {activeSelection?.status === 'error' ? (
                    <div className="buttonRow">
                      <button
                        type="button"
                        className="ghostBtn"
                        onClick={() => {
                          if (!activePhotoId || !activeSelectionId) return;
                          setPhotos((prev) =>
                            prev.map((photo) =>
                              photo.id !== activePhotoId
                                ? photo
                                : {
                                    ...photo,
                                    selections: photo.selections.map((selection) =>
                                      selection.id !== activeSelectionId
                                        ? selection
                                        : {
                                            ...selection,
                                            status: 'pending',
                                            error: undefined
                                          }
                                    )
                                  }
                            )
                          );
                        }}
                      >
                        Retry Active Error
                      </button>
                    </div>
                  ) : null}
                  {activeSelection?.error ? <p className="error">{activeSelection.error}</p> : null}
                  <p className="hint">
                    Drag on empty area to draw. Drag inside pending frame to move. Use corner handles to resize.
                  </p>
                  <p className="hint">
                    `done` frames are locked to prevent duplicate processing. Delete and reselect if needed.
                  </p>
                  <div className="buttonRow">
                    <button
                      type="button"
                      className="primaryBtn"
                      disabled={processing || processableSelections === 0}
                      onClick={() => void processSelections()}
                    >
                      {processing ? processingLabel || 'Processing...' : 'Extract Selected People'}
                    </button>
                    <span className="countBadge">{remainingPeopleSlots} slots left</span>
                  </div>
                  {processing ? <p className="hint">{processingLabel}</p> : null}
                  {processError ? <p className="error">{processError}</p> : null}
                </>
              ) : (
                <p className="hint">Upload a photo first.</p>
              )}
            </section>

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Background Settings</h3>
              </div>
              <div className="field">
                <div className="fieldLabelRow">
                  <label>Background Color</label>
                  <button
                    type="button"
                    className="exploreBtn"
                    onClick={() => setBackgroundExplore((prev) => !prev)}
                  >
                    <span className={`expandGlyph ${backgroundExplore ? 'open' : ''}`} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>{backgroundExplore ? 'Compact' : 'Explore'}</span>
                  </button>
                </div>
                <div className={`swatchGrid ${backgroundExplore ? 'expanded' : 'compact'}`}>
                  {visibleBackgroundColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`colorSwatchBtn ${backgroundColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                      onClick={() => {
                        setBackgroundColor(color);
                        setBackgroundImageUrl('');
                        setBackgroundError('');
                      }}
                      title={color}
                    >
                      <span className="colorSwatchDot" style={{ background: color }} />
                    </button>
                  ))}
                </div>
                <div className="hexRow">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      setBackgroundImageUrl('');
                      setBackgroundError('');
                    }}
                  />
                  <input
                    type="text"
                    value={backgroundHexInput}
                    onChange={(e) => setBackgroundHexInput(e.target.value)}
                    onBlur={() => applyBackgroundHex(backgroundHexInput)}
                    className="hexInput"
                    placeholder="#0f172a"
                  />
                  <button type="button" className="ghostBtn" onClick={() => applyBackgroundHex(backgroundHexInput)}>
                    Apply
                  </button>
                </div>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/*"
                  className="hiddenInput"
                  onChange={(e) => {
                    void handleBackgroundImageFile(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="buttonRow">
                  <button type="button" className="ghostBtn" onClick={() => backgroundInputRef.current?.click()}>
                    Upload Background Image
                  </button>
                  <button
                    type="button"
                    className="ghostBtn"
                    disabled={!backgroundImageUrl}
                    onClick={() => setBackgroundImageUrl('')}
                  >
                    Remove Background Image
                  </button>
                </div>
                {backgroundImageUrl ? <p className="hint">Background image is active.</p> : null}
                {backgroundError ? <p className="error">{backgroundError}</p> : null}
              </div>
            </section>

            {process.env.NODE_ENV === 'development' && (
              <section className="panelBlock devHealthBlock">
                <div className="panelTitleRow">
                  <h3>Replicate Health</h3>
                  <div className={`healthDot health-${replicateHealth}`} style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} aria-hidden="true" />
                </div>
                <div className="devHealthRow">
                  <span className="devHealthStatus">
                    {replicateHealth === 'operational' && '✅ Operational'}
                    {replicateHealth === 'degraded' && '⚠️ Degraded'}
                    {replicateHealth === 'outage' && '🔴 Outage'}
                    {replicateHealth === 'unknown' && '⬜ Unknown'}
                  </span>
                </div>
                {healthDescription ? (
                  <p className="devHealthDesc">{healthDescription}</p>
                ) : null}
                {healthCheckedAt ? (
                  <p className="devHealthTs">
                    Last checked: {new Date(healthCheckedAt).toLocaleTimeString()}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="devHealthBtn"
                  disabled={healthChecking}
                  onClick={() => { void runHealthCheck(); }}
                >
                  {healthChecking ? 'Checking…' : 'Check Now'}
                </button>
              </section>
            )}

          </div>

          <div className="rightPanelFooter">
            <button
              type="button"
              className="checkoutBtn"
              disabled={processing || !canCheckout}
              onClick={() => {
                setProcessError('Checkout integration for Image Studio will be connected next.');
              }}
            >
              Checkout
            </button>
          </div>
        </aside>
      </main>

      <style jsx>{`
        .designRoot :global(*),
        .designRoot :global(*::before),
        .designRoot :global(*::after) {
          box-sizing: border-box;
        }

        .designRoot {
          height: 100vh;
          background: #dce2ec;
          color: #0f172a;
          overflow: hidden;
        }

        .topbar {
          height: 84px;
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          z-index: 20;
          background: linear-gradient(90deg, #0b1224 0%, #14254d 100%);
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 22px;
          padding: 0 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandMark {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }

        .brandMark svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .brandMain {
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-size: 20px;
          line-height: 1;
          letter-spacing: 0.12em;
          color: #ffffff;
          font-weight: 700;
        }

        .brandSub {
          margin-top: 2px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-size: 10px;
          letter-spacing: 0.28em;
          color: rgba(255, 255, 255, 0.86);
        }

        .bannerPlaceholder {
          justify-self: stretch;
          height: 46px;
          border: 1px dashed rgba(255, 255, 255, 0.24);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
        }

        .layout {
          height: calc(100vh - 84px);
          margin-top: 84px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px 360px;
          grid-template-rows: 1fr;
        }

        .previewPanel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: radial-gradient(1300px 740px at 45% 12%, #f6f9ff 0%, #dbe3f2 52%, #c8d2e5 100%);
          border-right: 1px solid #c3ccdd;
          overflow-y: auto;
        }

        .previewHeader h2 {
          margin: 0;
          font-size: 28px;
          line-height: 1.05;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .previewHeader p {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 13px;
        }

        .posterWrap {
          width: min(100%, calc(620px * 1.2));
          display: grid;
          place-items: center;
        }

        .bottomPanel {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-left: 1px solid #c3ccdd;
          border-right: 1px solid #c3ccdd;
          overflow: hidden;
        }

        .bottomTabStrip {
          display: flex;
          border-bottom: 1px solid #dde3ee;
          background: #f0f3f9;
        }

        .bottomTab {
          flex: 1;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }

        .bottomTab:hover {
          color: #374151;
          background: rgba(99,102,241,0.05);
        }

        .bottomTab.active {
          color: #4f46e5;
          background: #fff;
          border-bottom: 2px solid #4f46e5;
        }

        .bottomTabContent {
          padding: 14px 16px;
          padding-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          background: #fff;
        }

        .countBadge {
          font-size: 12px;
          color: #9ca3af;
          align-self: center;
          margin-left: 8px;
        }

        .posterCanvas {
          width: min(100%, 620px);
          aspect-ratio: ${DESIGN_CANVAS_W} / ${DESIGN_CANVAS_H};
          border-radius: 20px;
          border: 1px solid rgba(15, 23, 42, 0.34);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center;
        }

        .posterEmpty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: rgba(255, 255, 255, 0.75);
          font-size: 14px;
          text-align: center;
          padding: 14px;
        }

        .personLayer {
          position: absolute;
          touch-action: none;
          cursor: grab;
          user-select: none;
          border-radius: 8px;
        }

        .personLayer.active {
          outline: 2px solid #ffdb4d;
          outline-offset: 2px;
        }

        .personLayer:active {
          cursor: grabbing;
        }

        .personLayer img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          pointer-events: none;
        }

        .layerControls {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          border-radius: 8px;
          padding: 4px 5px;
          pointer-events: all;
          white-space: nowrap;
        }

        .layerControlBtn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.9);
          cursor: pointer;
          transition: background 0.12s;
        }

        .layerControlBtn:hover {
          background: rgba(255,255,255,0.15);
        }

        .layerControlBtn:active {
          background: rgba(255,255,255,0.25);
        }

        .layerControlBtnActive {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }

        .textLayer {
          position: absolute;
          max-width: 92%;
          white-space: pre-wrap;
          line-height: 1.02;
          text-align: center;
          cursor: grab;
          user-select: none;
          touch-action: none;
          padding: 2px 6px;
          border-radius: 6px;
        }

        .textLayer.active {
          outline: 2px dashed rgba(255, 255, 255, 0.8);
          outline-offset: 2px;
        }

        .textLayer:active {
          cursor: grabbing;
        }

        .rightPanel {
          padding: 16px 14px 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(180deg, #edf1f8 0%, #e6ecf7 100%);
          border-left: 1px solid #c8d4e6;
        }

        .rightPanelScroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          align-content: start;
          gap: 14px;
          padding-right: 2px;
        }

        .rightPanelFooter {
          padding-top: 10px;
          margin-top: 10px;
          border-top: 1px solid #d1dbe9;
          background: linear-gradient(180deg, rgba(230, 236, 247, 0.3), #e6ecf7 30%);
        }

        .panelBlock {
          border: 1px solid #cad4e4;
          border-radius: 14px;
          background: #f9fbff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .devHealthBlock {
          border-color: #b8c4d8;
          background: #f0f4fa;
        }

        .devHealthRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .devHealthStatus {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }

        .devHealthDesc {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }

        .devHealthTs {
          font-size: 10px;
          color: #94a3b8;
          margin: 0;
          font-variant-numeric: tabular-nums;
        }

        .devHealthBtn {
          align-self: start;
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #94a3b8;
          background: #fff;
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .devHealthBtn:hover:not(:disabled) {
          background: #e2e8f0;
          border-color: #64748b;
        }

        .devHealthBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .panelTitleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .panelTitleRow h3 {
          margin: 0;
          font-size: 16px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          color: #0f172a;
        }

        .panelTitleRow span {
          font-size: 12px;
          color: #475569;
          font-weight: 700;
        }

        .hiddenInput {
          display: none;
        }

        .buttonRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .buttonGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        button {
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .primaryBtn,
        .ghostBtn,
        .dangerBtn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid transparent;
          padding: 0 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .primaryBtn {
          background: #1d4ed8;
          color: #fff;
          border-color: #1d4ed8;
        }

        .primaryBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ghostBtn {
          background: #ffffff;
          color: #0f172a;
          border-color: #cbd5e1;
        }

        .ghostBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dangerBtn {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .dangerBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .checkoutBtn {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
        }

        .checkoutBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hint {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.35;
        }

        .error {
          margin: 0;
          font-size: 12px;
          color: #b91c1c;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .photoList {
          display: grid;
          gap: 8px;
        }

        .photoItem {
          border: 1px solid #d8e1ee;
          border-radius: 10px;
          background: #fff;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 6px 6px 6px 10px;
        }

        .photoItem.active {
          border-color: #2563eb;
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.3);
        }

        .photoSelect {
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 2px;
          padding: 0;
          min-width: 0;
        }

        .photoName {
          font-size: 13px;
          color: #0f172a;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .photoMeta {
          font-size: 11px;
          color: #64748b;
        }

        .selectionBoardWrap {
          border: 1px solid #c9d6ea;
          border-radius: 12px;
          overflow: hidden;
          background: #111827;
        }

        .selectionBoard {
          position: relative;
          width: 100%;
          touch-action: none;
          user-select: none;
          cursor: crosshair;
        }

        .selectionBoard img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          pointer-events: none;
        }

        .selectionRect {
          position: absolute;
          border: 2px dashed #facc15;
          background: rgba(250, 204, 21, 0.14);
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.42);
        }

        .selectionRect.active {
          outline: 2px solid #38bdf8;
          outline-offset: 1px;
        }

        .selectionRect.status-done {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.14);
        }

        .selectionRect.status-processing {
          border-color: #eab308;
          background: rgba(234, 179, 8, 0.2);
        }

        .selectionRect.status-error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.18);
        }

        .selectionRect.draft {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.16);
        }

        .selectionBadge {
          position: absolute;
          top: -22px;
          left: 0;
          font-size: 11px;
          line-height: 1;
          font-weight: 800;
          color: #111827;
          background: #facc15;
          padding: 4px 6px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .selectionRect.status-done .selectionBadge {
          background: #22c55e;
          color: #f8fffa;
        }

        .selectionRect.status-error .selectionBadge {
          background: #ef4444;
          color: #fff;
        }

        .selectionRect.status-processing .selectionBadge {
          background: #eab308;
          color: #111827;
        }

        .selectionRect button {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid #7f1d1d;
          background: #fee2e2;
          color: #7f1d1d;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          display: grid;
          place-items: center;
        }

        .resizeHandle {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 1px solid #0f172a;
          background: #fff;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.3);
          z-index: 2;
        }

        .resizeHandle.nw {
          left: -7px;
          top: -7px;
          cursor: nwse-resize;
        }

        .resizeHandle.ne {
          right: -7px;
          top: -7px;
          cursor: nesw-resize;
        }

        .resizeHandle.sw {
          left: -7px;
          bottom: -7px;
          cursor: nesw-resize;
        }

        .resizeHandle.se {
          right: -7px;
          bottom: -7px;
          cursor: nwse-resize;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field label {
          font-size: 12px;
          color: #334155;
          font-weight: 700;
        }

        .fieldLabelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .exploreBtn {
          min-height: 34px;
          border-radius: 999px;
          border: 1px solid #b9c1cf;
          background: #f7f9ff;
          color: #26324a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0 10px 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }

        .expandGlyph {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid #98a3b8;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          padding: 3px;
          background: #ffffff;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .expandGlyph span {
          border-radius: 50%;
          background: #4d6287;
          opacity: 0.95;
        }

        .expandGlyph.open {
          transform: rotate(45deg);
          border-color: #556fa3;
        }

        .swatchGrid {
          display: grid;
          gap: 8px;
        }

        .swatchGrid.compact {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .swatchGrid.expanded {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .colorSwatchBtn {
          height: 58px;
          border-radius: 12px;
          border: 1px solid #d6dfec;
          background: #ffffff;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .colorSwatchBtn.active {
          border-color: #2563eb;
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.32);
          background: #eff6ff;
        }

        .colorSwatchDot {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 2px solid rgba(15, 23, 42, 0.16);
        }

        .hexRow {
          display: grid;
          grid-template-columns: 64px 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .hexInput {
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          padding: 0 10px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .textInput {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          min-height: 88px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.35;
          resize: vertical;
          background: #fff;
          color: #0f172a;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        input[type='range'] {
          width: 100%;
        }

        input[type='color'] {
          width: 100%;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          padding: 0;
          background: #fff;
        }

        .fontPresetGrid {
          display: grid;
          gap: 8px;
        }

        .fontPresetGrid.compact {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .fontPresetGrid.expanded {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .fontPresetCard {
          border: 1px solid #d8e0ec;
          border-radius: 12px;
          background: #ffffff;
          min-height: 96px;
          padding: 8px;
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 6px;
          color: #0f172a;
          cursor: pointer;
        }

        .fontPresetCard.active {
          border-color: #2563eb;
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.3);
          background: #eff6ff;
        }

        .fontPresetGrid.compact .fontPresetCard {
          min-height: 82px;
          padding: 6px 4px;
          gap: 3px;
        }

        .fontPresetGrid.compact .fontPreview {
          font-size: 34px;
        }

        .fontPresetGrid.compact .fontLabel {
          font-size: 10px;
          letter-spacing: 0.01em;
          text-align: center;
        }

        .fontPreview {
          font-size: 44px;
          line-height: 0.95;
          color: #0f172a;
        }

        .fontLabel {
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.03em;
        }

        .layerList {
          display: grid;
          gap: 6px;
          max-height: 170px;
          overflow: auto;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          padding: 6px;
          background: #fff;
        }

        .layerItem {
          min-height: 34px;
          border-radius: 8px;
          border: 1px solid #d7deea;
          background: #f8fafc;
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 0 8px;
          text-align: left;
          color: #0f172a;
          font-size: 12px;
          cursor: pointer;
        }

        .layerItem.active {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.28);
        }

        .layerItem span:first-child {
          color: #475569;
          font-weight: 700;
        }

        @media (max-width: 1200px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr);
          }

          .previewPanel {
            border-right: 0;
            border-bottom: 1px solid #c3ccdd;
          }

          .bottomPanel {
            border-left: 0;
            border-right: 0;
            border-top: 0;
            border-bottom: 1px solid #c3ccdd;
            max-height: 300px;
          }

          .rightPanel {
            border-left: 0;
          }
        }

        @media (max-width: 800px) {
          .topbar {
            padding: 0 12px;
            gap: 10px;
          }

          .brandMain {
            font-size: 16px;
          }

          .previewPanel {
            padding: 12px;
          }

          .rightPanel {
            padding: 12px;
          }

          .swatchGrid.compact {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .fontPresetGrid.compact {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
