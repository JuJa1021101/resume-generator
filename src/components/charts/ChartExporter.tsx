import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatchResult } from '../../types';
import { ExportConfig, ChartTheme } from './types';

interface ChartExporterProps {
  data: MatchResult;
  theme: ChartTheme;
  chartRef: React.RefObject<HTMLElement>;
  className?: string;
}

const ChartExporter: React.FC<ChartExporterProps> = ({
  data,
  theme,
  chartRef,
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Export as PNG
  const exportAsPNG = async (config: Partial<ExportConfig> = {}) => {
    if (!chartRef.current) return;

    setIsExporting(true);
    setExportProgress(25);

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: theme.colors.background,
        scale: config.quality || 2,
        useCORS: true,
        allowTaint: true,
      });

      setExportProgress(75);

      const link = document.createElement('a');
      link.download = config.filename || 'skill-analysis-chart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      setExportProgress(100);
    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setShowExportMenu(false);
      }, 1000);
    }
  };

  // Export as SVG
  const exportAsSVG = async (config: Partial<ExportConfig> = {}) => {
    if (!chartRef.current) return;

    setIsExporting(true);
    setExportProgress(25);

    try {
      const svg = chartRef.current.querySelector('svg');
      if (!svg) {
        throw new Error('No SVG element found');
      }

      setExportProgress(50);

      const clonedSvg = svg.cloneNode(true) as SVGElement;
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      if (config.includeTitle) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = '技能分析图表';
        clonedSvg.insertBefore(title, clonedSvg.firstChild);
      }

      setExportProgress(75);

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = config.filename || 'skill-analysis-chart.svg';
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);
      setExportProgress(100);
    } catch (error) {
      console.error('SVG export failed:', error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setShowExportMenu(false);
      }, 1000);
    }
  };

  // Export as PDF
  const exportAsPDF = async (config: Partial<ExportConfig> = {}) => {
    if (!chartRef.current) return;

    setIsExporting(true);
    setExportProgress(20);

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: theme.colors.background,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      setExportProgress(50);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (config.includeTitle) {
        pdf.setFontSize(16);
        pdf.text('技能分析报告', 20, 20);

        pdf.setFontSize(12);
        pdf.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);
        pdf.text(`总体匹配度: ${Math.round(data.overallScore)}%`, 20, 40);
      }

      setExportProgress(75);

      const yPosition = config.includeTitle ? 50 : 20;
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        20,
        yPosition,
        imgWidth - 40,
        imgHeight
      );

      pdf.save(config.filename || 'skill-analysis-report.pdf');
      setExportProgress(100);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setShowExportMenu(false);
      }, 1000);
    }
  };

  const exportOptions = [
    {
      format: 'png' as const,
      label: 'PNG 图片',
      description: '高质量图片格式',
      icon: '🖼️',
      action: exportAsPNG,
    },
    {
      format: 'svg' as const,
      label: 'SVG 矢量图',
      description: '可缩放矢量格式',
      icon: '📐',
      action: exportAsSVG,
    },
    {
      format: 'pdf' as const,
      label: 'PDF 报告',
      description: '包含数据的完整报告',
      icon: '📄',
      action: exportAsPDF,
    },
  ];

  return (
    <div className={`chart-exporter relative ${className}`}>
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        disabled={isExporting}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80"
        style={{
          backgroundColor: theme.colors.accent + '20',
          borderColor: theme.colors.accent,
          color: theme.colors.text,
        }}
      >
        {isExporting ? (
          <>
            <div
              className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"
              style={{ borderColor: theme.colors.accent }}
            />
            <span>导出中... {exportProgress}%</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>导出</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showExportMenu && !isExporting && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-64 rounded-lg border shadow-lg z-50"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.grid,
            }}
          >
            <div className="p-2">
              <div
                className="text-sm font-semibold mb-2 px-2"
                style={{ color: theme.colors.text }}
              >
                选择导出格式
              </div>

              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => option.action({ includeTitle: true, includeData: true })}
                  className="w-full flex items-center space-x-3 px-2 py-2 rounded hover:bg-opacity-50 transition-colors"
                  style={{
                    color: theme.colors.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  <span className="text-lg">{option.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs opacity-75">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isExporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div
            className="rounded-lg p-6 max-w-sm w-full mx-4"
            style={{ backgroundColor: theme.colors.background }}
          >
            <div className="text-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent mx-auto mb-4"
                style={{ borderColor: theme.colors.accent }}
              />
              <div
                className="text-lg font-semibold mb-2"
                style={{ color: theme.colors.text }}
              >
                正在导出图表...
              </div>
              <div
                className="w-full bg-gray-200 rounded-full h-2"
                style={{ backgroundColor: theme.colors.grid }}
              >
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: theme.colors.accent }}
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChartExporter;