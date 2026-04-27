import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, X, Upload as UploadIcon } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { uploadApi } from '@/api/upload.api';
import { Header } from '@/components/layout/Header';

export default function VendorUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceMode, setPriceMode] = useState<'fixed' | 'range'>('fixed');
  const [moq, setMoq] = useState('1');
  const [bulkMode, setBulkMode] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      const imageFiles = Array.from(droppedFiles).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length > 0) handleFiles(imageFiles);
    }
  }, []);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.getCategories(),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error('Add photos first');
      if (!categoryId) throw new Error('Pick a category');

      const brands = await (await import('@/api/brand.api')).brandApi.listMy();
      const brandId = brands[0]?.id;
      if (!brandId) throw new Error('Add a brand first from Dashboard');

      const category = categories?.find((c) => c.id === categoryId);
      const baseName = category?.name || 'Product';
      const moqVal = parseInt(moq, 10) || 1;
      const parsedPrice = price ? parseFloat(price) : undefined;
      const parsedPriceMax = priceMode === 'range' && priceMax ? parseFloat(priceMax) : undefined;

      if (bulkMode && files.length > 1) {
        const total = files.length;
        setProgress({ done: 0, total });
        for (let i = 0; i < total; i++) {
          const { urls } = await uploadApi.postProductImages([files[i]]);
          await productApi.create({
            name: `${baseName} ${i + 1}`,
            images: urls,
            categoryId,
            brandId,
            moq: moqVal,
            price: parsedPrice,
            priceMax: parsedPriceMax,
          });
          setProgress({ done: i + 1, total });
        }
      } else {
        const { urls } = await uploadApi.postProductImages(files);
        await productApi.create({
          name: `${baseName} - ${new Date().toLocaleDateString('en-IN')}`,
          images: urls,
          categoryId,
          brandId,
          moq: moqVal,
          price: parsedPrice,
          priceMax: parsedPriceMax,
        });
      }
    },
    onSuccess: () => {
      const count = bulkMode && files.length > 1 ? files.length : 1;
      toast.success(`${count} product${count > 1 ? 's' : ''} uploaded!`);
      setFiles([]);
      setPreviews([]);
      setCategoryId('');
      setPrice('');
      setPriceMax('');
      setPriceMode('fixed');
      setMoq('1');
      setProgress(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setProgress(null);
    },
  });

  const handleFiles = (selected: FileList | File[] | null) => {
    if (!selected) return;
    const added = Array.from(selected);
    setFiles((prev) => [...prev, ...added]);
    setPreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Header title="Upload" />

      <div
        className="mx-auto max-w-4xl px-4 py-4 space-y-5"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {previews.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed min-h-[240px] transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-gray-50 active:bg-gray-100'
            }`}
          >
            {isDragging ? (
              <>
                <UploadIcon className="h-14 w-14 text-primary-500" />
                <span className="text-lg font-medium text-primary-600">Drop photos here</span>
              </>
            ) : (
              <>
                <Camera className="h-14 w-14 text-gray-400" />
                <span className="text-lg font-medium text-gray-500">Add Photos</span>
                <span className="text-sm text-gray-400">or drag & drop</span>
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1.5 text-white active:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-300 active:bg-gray-100"
            >
              <Camera className="h-8 w-8 text-gray-400" />
            </button>
          </div>
        )}

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm min-h-[48px] text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-gray-600">Price (₹)</span>
            <div className="flex rounded-full bg-gray-200 p-0.5">
              <button
                type="button"
                onClick={() => { setPriceMode('fixed'); setPriceMax(''); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${priceMode === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Fixed
              </button>
              <button
                type="button"
                onClick={() => setPriceMode('range')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${priceMode === 'range' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Range
              </button>
            </div>
          </div>
          {priceMode === 'fixed' ? (
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 450"
              className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm min-h-[48px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          ) : (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Min"
                className="flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm min-h-[48px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <span className="text-gray-400 text-sm font-medium">–</span>
              <input
                type="number"
                inputMode="decimal"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max"
                className="flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm min-h-[48px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          )}
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={moq}
          onChange={(e) => setMoq(e.target.value)}
          placeholder="Min order qty"
          className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm min-h-[48px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
        />

        {files.length > 1 && (
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`w-full rounded-full py-3 text-sm font-semibold min-h-[48px] transition-colors ${
              bulkMode ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-500/30' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {bulkMode ? `Bulk: each photo = 1 product (${files.length} products)` : 'All photos = 1 product'}
          </button>
        )}

        {progress && (
          <div className="w-full rounded-full bg-gray-100 h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        )}

        <button
          onClick={() => upload.mutate()}
          disabled={upload.isPending || files.length === 0 || !categoryId}
          className="w-full rounded-full bg-primary-600 py-3.5 text-base font-bold text-white min-h-[52px] active:bg-primary-700 disabled:opacity-50"
        >
          {upload.isPending
            ? progress
              ? `Uploading ${progress.done}/${progress.total}...`
              : 'Uploading...'
            : bulkMode && files.length > 1
              ? `Upload ${files.length} products`
              : 'Upload'}
        </button>
      </div>
    </>
  );
}
