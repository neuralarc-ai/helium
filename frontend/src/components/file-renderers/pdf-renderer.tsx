'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PdfRendererProps {
  url: string;
  className?: string;
}

export function PdfRenderer({ url, className }: PdfRendererProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      setIsSmallScreen(screenWidth >= 300 && screenWidth <= 560);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ 
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    const currentContainer = containerRef.current;
    if (currentContainer) {
      observer.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
    };
  }, []);

  useEffect(() => {
    if (pageDimensions.width > 0 && containerSize.width > 0) {
      const scaleByWidth = containerSize.width / pageDimensions.width;

      if (isSmallScreen) {
        setScale(scaleByWidth);
        setDynamicHeight(pageDimensions.height * scaleByWidth);
      } else if (containerSize.height > 0) {
        const scaleByHeight = containerSize.height / pageDimensions.height;
        setScale(Math.min(scaleByWidth, scaleByHeight));
        setDynamicHeight(null);
      }
    }
  }, [pageDimensions, containerSize, isSmallScreen]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  function onPageLoadSuccess(page: PDFPageProxy): void {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions({ width: viewport.width, height: viewport.height });
  }

  function changePage(offset: number) {
    setPageNumber((prev) => {
      const next = prev + offset;
      return next >= 1 && next <= (numPages || 1) ? next : prev;
    });
  }

  return (
    <div className={cn('flex flex-col w-full h-full', className)}>
      <div 
        ref={containerRef} 
        className={cn(
          'flex justify-center overflow-hidden rounded-md p-2',
          isSmallScreen ? 'items-start' : 'flex-1 items-center'
        )}
        style={{ height: dynamicHeight ? `${dynamicHeight}px` : undefined }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            onLoadSuccess={onPageLoadSuccess}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {numPages && (
        <div className="flex items-center justify-end p-2 bg-background border-t">
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(-1)}
              className="p-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-xs font-medium px-1">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => changePage(1)}
              className="p-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
