/**
 * ScreenshotUploader — Drag-and-drop zone for MT5 terminal screenshots.
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { screenshotsApi } from '@/api/client';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ScreenshotUploaderProps {
  onUploadComplete?: (screenshotId: string) => void;
}

export default function ScreenshotUploader({ onUploadComplete }: ScreenshotUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setStatus('idle');

    try {
      const response = await screenshotsApi.upload(file);
      const screenshotId = response.data.id;

      // Trigger OCR processing
      await screenshotsApi.process(screenshotId);

      setStatus('success');
      setMessage(`Uploaded & processed: ${file.name}`);
      onUploadComplete?.(screenshotId);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
  });

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary-400" />
        Upload Screenshot
      </h3>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-400 bg-primary-500/10'
            : 'border-slate-700 hover:border-slate-500'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
            <p className="text-slate-400">Uploading & processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-slate-500" />
            <p className="text-slate-400">
              {isDragActive ? 'Drop the screenshot here' : 'Drag & drop a screenshot, or click to browse'}
            </p>
            <p className="text-xs text-slate-600">
              Supports JPG, PNG, WebP — Max 10MB
            </p>
          </div>
        )}
      </div>

      {status === 'success' && (
        <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
