/**
 * ScreenshotUpload — Drag & drop zone for MT5 terminal screenshots with OCR processing.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { screenshotsApi } from '@/api/client';
import { Upload, CheckCircle, AlertCircle, Loader2, FileImage } from 'lucide-react';

interface ScreenshotUploadProps {
  onUploadComplete?: (data: any) => void;
}

export default function ScreenshotUpload({ onUploadComplete }: ScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setStatus('idle');
      setExtractedData(null);

      try {
        // Upload screenshot
        const uploadResponse = await screenshotsApi.upload(file);
        const screenshotId = uploadResponse.data.id;

        // Trigger OCR processing
        const processResponse = await screenshotsApi.process(screenshotId);

        setExtractedData(processResponse.data);
        setStatus('success');
        setMessage(`Successfully processed: ${file.name}`);

        if (onUploadComplete) {
          onUploadComplete(processResponse.data);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Upload or processing failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete],
  );

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
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-400" />
        Upload MT5 Screenshot
      </h3>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <p className="text-slate-300 text-lg">Uploading & processing with OCR...</p>
            <p className="text-slate-500 text-sm">This may take a few seconds</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileImage className="w-12 h-12 text-slate-500" />
            <p className="text-slate-300 text-lg">
              {isDragActive ? 'Drop the screenshot here' : 'Drag & drop a screenshot here'}
            </p>
            <p className="text-slate-500 text-sm">or click to browse files</p>
            <p className="text-slate-600 text-xs mt-2">
              Supports JPG, PNG, WebP • Max 10MB
            </p>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData?.extracted_data && (
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4">📊 Extracted Data</h4>

          {/* Account Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Balance</div>
              <div className="text-lg font-bold text-white font-mono">
                ${extractedData.extracted_data.balance?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Equity</div>
              <div className="text-lg font-bold text-blue-400 font-mono">
                ${extractedData.extracted_data.equity?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Margin</div>
              <div className="text-lg font-bold text-yellow-400 font-mono">
                ${extractedData.extracted_data.margin?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Credit</div>
              <div className="text-lg font-bold text-green-400 font-mono">
                ${extractedData.extracted_data.credit?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* Positions */}
          {extractedData.extracted_data.positions && extractedData.extracted_data.positions.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-slate-300 mb-2">
                Positions ({extractedData.extracted_data.positions.length})
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 px-2 text-slate-400">Symbol</th>
                      <th className="text-left py-2 px-2 text-slate-400">Type</th>
                      <th className="text-right py-2 px-2 text-slate-400">Volume</th>
                      <th className="text-right py-2 px-2 text-slate-400">Open</th>
                      <th className="text-right py-2 px-2 text-slate-400">Current</th>
                      <th className="text-right py-2 px-2 text-slate-400">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.extracted_data.positions.map((pos: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-700">
                        <td className="py-2 px-2 text-white font-mono">{pos.symbol}</td>
                        <td className="py-2 px-2">
                          <span className={pos.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {pos.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-white font-mono">
                          {pos.volume?.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-white font-mono">
                          {pos.open_price?.toFixed(5)}
                        </td>
                        <td className="py-2 px-2 text-right text-white font-mono">
                          {pos.current_price?.toFixed(5)}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono ${
                            pos.profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          ${pos.profit?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Status */}
          {extractedData.extracted_data.validation_passed !== undefined && (
            <div className="mt-4">
              {extractedData.extracted_data.validation_passed ? (
                <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                  <p className="text-green-300 text-sm">✓ Data validation passed</p>
                </div>
              ) : (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm mb-2">⚠️ Validation warnings:</p>
                  <ul className="text-yellow-200 text-xs space-y-1">
                    {extractedData.extracted_data.validation_errors?.map((err: string, idx: number) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* OCR Confidence */}
          {extractedData.extracted_data.confidence && (
            <div className="mt-4 text-xs text-slate-500">
              OCR Confidence: {(extractedData.extracted_data.confidence * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
