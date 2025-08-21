'use client';

import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

interface CsvRendererProps {
    content: string;
    className?: string;
}

/**
 * Parse CSV content into a data structure with headers and rows
 */
function parseCSV(content: string) {
    if (!content) return { data: [], headers: [] };

    try {
        // Preview first two rows to guess header
        const preview = Papa.parse(content, {
            header: false,
            skipEmptyLines: true,
            preview: 2,
            dynamicTyping: true,
        });

        if (!preview.data || preview.data.length === 0) {
            return { data: [], headers: [] };
        }

        const firstRow = preview.data[0] as any[];
        const secondRow = preview.data.length > 1 ? preview.data[1] as any[] : null;

        let detectedHeader = false;
        if (secondRow) {
            const firstRowIsString = firstRow.every(cell => typeof cell === 'string' && isNaN(Number(cell)));
            const secondRowHasNumber = secondRow.some(cell => typeof cell === 'number' && !isNaN(cell));

            if (firstRowIsString && secondRowHasNumber) {
                detectedHeader = true;
            } else {
                // Fallback for when types are not perfectly detected, e.g., all strings
                const firstRowLooksLikeHeader = firstRow.every(cell => isNaN(Number(cell)));
                const secondRowLooksLikeData = secondRow.some(cell => !isNaN(Number(cell)));
                if (firstRowLooksLikeHeader && secondRowLooksLikeData) {
                    detectedHeader = true;
                }
            }
        }

        // Full parse with correct header setting
        const results = Papa.parse(content, {
            header: detectedHeader,
            skipEmptyLines: true,
            dynamicTyping: true,
        });

        let headers = results.meta.fields || [];
        if (!detectedHeader || headers.length === 0) {
            headers = (results.data[0] ? Object.keys(results.data[0]) : []).map((_, i) => `Column ${i + 1}`);
        }

        let data = results.data;
        if (!detectedHeader) {
             data = results.data.map((row: any) => {
                const newRow: { [key: string]: any } = {};
                headers.forEach((header, i) => {
                    newRow[header] = row[i];
                });
                return newRow;
            });
        }

        return { headers, data };
    } catch (error) {
        console.error("Error parsing CSV:", error);
        return { headers: [], data: [] };
    }
}

/**
 * CSV/TSV renderer that presents data in a table format
 */
export function CsvRenderer({
    content,
    className
}: CsvRendererProps) {
    const { headers, data } = parseCSV(content);
    const isEmpty = data.length === 0;
    const [emptyRows, setEmptyRows] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowWidth, setWindowWidth] = useState(0);

    // Track window width for responsive behavior
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        // Set initial width
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || windowWidth <= 1300) {
            setEmptyRows(0);
            return;
        }

        const calculateEmptyRows = () => {
            const table = container.querySelector('table');
            if (!table || isEmpty) {
                setEmptyRows(0);
                return;
            }

            const header = table.querySelector('thead');
            const firstRow = table.querySelector('tbody tr');

            if (!header || !firstRow) {
                setEmptyRows(0);
                return;
            }

            const headerHeight = (header as HTMLElement).offsetHeight;
            const rowHeight = (firstRow as HTMLElement).offsetHeight;
            const containerHeight = container.offsetHeight;

            const totalContentHeight = headerHeight + (data.length * rowHeight);

            if (containerHeight > totalContentHeight) {
                const remainingHeight = containerHeight - totalContentHeight;
                const newEmptyRows = Math.floor(remainingHeight / rowHeight);
                setEmptyRows(Math.max(0, newEmptyRows));
            } else {
                setEmptyRows(0);
            }
        };

        calculateEmptyRows();

        const resizeObserver = new ResizeObserver(calculateEmptyRows);
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [data, headers, isEmpty, windowWidth]);

    return (
        <div ref={containerRef} className={cn('w-full h-full flex flex-col', className)}>
            <div className="flex-1 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-muted sticky top-0">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} className="px-3 py-2 text-left font-medium border border-border">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {!isEmpty ? (
                            <>
                                {data.map((row: any, rowIndex) => (
                                    <tr key={rowIndex} className="border-b border-border hover:bg-muted/50">
                                        {headers.map((header, cellIndex) => (
                                            <td key={cellIndex} className="px-3 py-2 border border-border">
                                                {row[header] !== undefined && row[header] !== null ? String(row[header]) : '\u00A0'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {windowWidth > 1300 && Array.from({ length: emptyRows }).map((_, index) => (
                                    <tr key={`empty-${index}`} className="border-b border-border">
                                        {headers.map((_, cellIndex) => (
                                            <td key={cellIndex} className="px-3 py-2 border border-border">
                                                &nbsp;
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ) : (
                            <tr>
                                <td colSpan={headers.length || 1} className="py-4 text-center text-muted-foreground">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 
