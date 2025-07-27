import React, { useState, useCallback } from 'react';
import {
  PDFService,
  PDFExportOptions
} from '../../services/pdf/pdf-service';
import {
  PDFGenerationProgress,
  PDFGenerationResult,
  ResumeTemplate
} from '../../services/pdf/pdf-generator';
import { ResumeContent } from '../../types';
import { DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PDFExporterProps {
  resumeData: ResumeContent;
  className?: string;
  onExportComplete?: (result: PDFGenerationResult) => void;
  onExportError?: (error: Error) => void;
}

interface ExportState {
  isExporting: boolean;
  progress: PDFGenerationProgress | null;
  error: string | null;
  result: PDFGenerationResult | null;
}

const PDFExporter: React.FC<PDFExporterProps> = ({
  resumeData,
  className = '',
  onExportComplete,
  onExportError
}) => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: null,
    error: null,
    result: null
  });

  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>('modern');
  const [exportOptions, setExportOptions] = useState<Partial<PDFExportOptions>>({
    fontSize: 11,
    margin: 20,
    colorScheme: 'blue',
    includePhoto: false,
    autoDownload: true
  });

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const pdfService = new PDFService();

  const handleExport = useCallback(async () => {
    setExportState({
      isExporting: true,
      progress: null,
      error: null,
      result: null
    });

    try {
      const options: Partial<PDFExportOptions> = {
        ...exportOptions,
        template: selectedTemplate
      };

      const result = await pdfService.generateResume(
        resumeData,
        options,
        (progress) => {
          setExportState(prev => ({
            ...prev,
            progress
          }));
        }
      );

      setExportState({
        isExporting: false,
        progress: null,
        error: null,
        result
      });

      onExportComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setExportState({
        isExporting: false,
        progress: null,
        error: errorMessage,
        result: null
      });

      onExportError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [resumeData, selectedTemplate, exportOptions, pdfService, onExportComplete, onExportError]);

  const handleCancel = useCallback(() => {
    pdfService.cancelGeneration();
    setExportState({
      isExporting: false,
      progress: null,
      error: null,
      result: null
    });
  }, [pdfService]);

  const templates = pdfService.getAvailableTemplates();
  const estimatedTime = pdfService.estimateGenerationTime(resumeData);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Export Resume as PDF</h3>
        {exportState.result && (
          <div className="text-sm text-green-600">
            Generated in {(exportState.result.generationTime / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Template Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                {selectedTemplate === template.id && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvancedOptions && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size
              </label>
              <select
                value={exportOptions.fontSize}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  fontSize: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={9}>Small (9pt)</option>
                <option value={10}>Medium (10pt)</option>
                <option value={11}>Normal (11pt)</option>
                <option value={12}>Large (12pt)</option>
              </select>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Scheme
              </label>
              <select
                value={exportOptions.colorScheme}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  colorScheme: e.target.value as any
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="gray">Gray</option>
              </select>
            </div>

            {/* Margin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margin
              </label>
              <select
                value={exportOptions.margin}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  margin: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>Narrow (15mm)</option>
                <option value={20}>Normal (20mm)</option>
                <option value={25}>Wide (25mm)</option>
              </select>
            </div>

            {/* Auto Download */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoDownload"
                checked={exportOptions.autoDownload}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  autoDownload: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoDownload" className="ml-2 text-sm text-gray-700">
                Auto-download PDF
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Progress Display */}
      {exportState.isExporting && exportState.progress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {exportState.progress.message}
            </span>
            <button
              onClick={handleCancel}
              className="text-blue-600 hover:text-blue-700"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportState.progress.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {exportState.progress.progress}% complete
          </div>
        </div>
      )}

      {/* Error Display */}
      {exportState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Export Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {exportState.error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {exportState.result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-800">
                PDF Generated Successfully
              </h3>
              <div className="mt-1 text-sm text-green-700">
                File size: {(exportState.result.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={() => {
                const url = URL.createObjectURL(exportState.result!.blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `resume_${selectedTemplate}_${Date.now()}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Download Again
            </button>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Estimated time: {(estimatedTime / 1000).toFixed(1)}s
        </div>
        <button
          onClick={handleExport}
          disabled={exportState.isExporting}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${exportState.isExporting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
        >
          {exportState.isExporting ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Generating...
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PDFExporter;