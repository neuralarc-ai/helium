'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { 
    Search, 
    ChevronUp, 
    ChevronDown, 
    FileSpreadsheet,
    ArrowUpDown,
    Filter,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface CsvRendererProps {
    content: string;
    className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
    column: string;
    direction: SortDirection;
}

function parseCSV(content: string, headerOverride?: boolean) {
    if (!content) return { data: [], headers: [], meta: null, detectedHeader: false };

    try {
        // Preview first two rows to guess header
        const preview = Papa.parse(content, {
            header: false,
            skipEmptyLines: true,
            preview: 2,
            dynamicTyping: true,
        });

        if (!preview.data || preview.data.length === 0) {
            return { headers: [], data: [], meta: null, detectedHeader: false };
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

        const useHeader = headerOverride !== undefined ? headerOverride : detectedHeader;

        // Full parse with correct header setting
        const results = Papa.parse(content, {
            header: useHeader,
            skipEmptyLines: true,
            dynamicTyping: true,
        });

        let headers = results.meta.fields || [];
        if (!useHeader || headers.length === 0) {
            headers = (results.data[0] ? Object.keys(results.data[0]) : []).map((_, i) => `Column ${i + 1}`);
        }

        // If we generated headers but the first row was a header, PapaParse keeps it as data.
        // We need to format the data to match our generated headers.
        let data = results.data;
        if (!useHeader) {
             data = results.data.map((row: any) => {
                const newRow: { [key: string]: any } = {};
                headers.forEach((header, i) => {
                    newRow[header] = row[i];
                });
                return newRow;
            });
        }

        return { 
            headers,
            data,
            meta: results.meta,
            detectedHeader
        };
    } catch (error) {
        console.error("Error parsing CSV:", error);
        return { headers: [], data: [], meta: null, detectedHeader: false };
    }
}

export function CsvRenderer({
    content,
    className
}: CsvRendererProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(50);
    const [hasHeader, setHasHeader] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        const initialParse = parseCSV(content);
        setHasHeader(initialParse.detectedHeader);
    }, [content]);

    const parsedData = useMemo(() => {
        return parseCSV(content, hasHeader);
    }, [content, hasHeader]);

    const isEmpty = parsedData.data.length === 0;

    const processedData = useMemo(() => {
        let filtered = parsedData.data;

        if (searchTerm) {
            filtered = filtered.filter((row: any) =>
                Object.values(row).some(value =>
                    String(value).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        if (sortConfig.column && sortConfig.direction) {
            filtered = [...filtered].sort((a: any, b: any) => {
                const aVal = a[sortConfig.column];
                const bVal = b[sortConfig.column];
                
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
                if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
                
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                
                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [parsedData.data, searchTerm, sortConfig]);


    const totalPages = Math.ceil(processedData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = processedData.slice(startIndex, startIndex + rowsPerPage);

    const visibleHeaders = parsedData.headers.filter(header => !hiddenColumns.has(header));

    const handleSort = (column: string) => {
        setSortConfig(prev => {
            if (prev.column === column) {
                const newDirection = prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc';
                return { column: newDirection ? column : '', direction: newDirection };
            } else {
                return { column, direction: 'asc' };
            }
        });
    };

    const toggleColumnVisibility = (column: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(column)) {
                newSet.delete(column);
            } else {
                newSet.add(column);
            }
            return newSet;
        });
    };

    const getSortIcon = (column: string) => {
        if (sortConfig.column !== column) {
            return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
        }
        return sortConfig.direction === 'asc' ? 
            <ChevronUp className="h-3 w-3 text-primary" /> : 
            <ChevronDown className="h-3 w-3 text-primary" />;
    };

    const formatCellValue = (value: any) => {
        if (value == null) return '';
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    };

    const getCellClassName = (value: any) => {
        if (typeof value === 'number') {
            return 'text-left font-mono';
        }
        if (typeof value === 'boolean') {
            return value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        }
        return '';
    };

    if (isEmpty) {
        return (
            <div className={cn('w-full h-full flex items-center justify-center', className)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-foreground">No Data</h3>
                        <p className="text-sm text-muted-foreground">This CSV file appears to be empty or invalid.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('w-full h-full flex flex-col bg-background', className)}>
            <div className="flex-shrink-0 border-b bg-muted/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <div>
                            <h3 className="font-medium text-foreground">CSV Data</h3>
                            <p className="text-xs text-muted-foreground">
                                {processedData.length.toLocaleString()} rows, {visibleHeaders.length} columns
                                {searchTerm && ` (filtered from ${parsedData.data.length.toLocaleString()})`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="header-toggle"
                                checked={hasHeader === true}
                                onCheckedChange={setHasHeader}
                            />
                            <Label htmlFor="header-toggle" className="text-sm font-medium whitespace-nowrap">
                                First row is header
                            </Label>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-1" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5 text-sm font-medium">Show/Hide Columns</div>
                                <DropdownMenuSeparator />
                                {parsedData.headers.map((header, index) => (
                                    <DropdownMenuCheckboxItem
                                        key={`${header}-${index}`}
                                        checked={!hiddenColumns.has(header)}
                                        onCheckedChange={() => toggleColumnVisibility(header)}
                                    >
                                        {header}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search data..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <table className="w-full border-collapse table-fixed" style={{ minWidth: `${visibleHeaders.length * 150}px` }}>
                        <thead className="sticky top-0 z-10">
                            <tr>
                                {visibleHeaders.map((header, index) => (
                                    <th 
                                        key={`${header}-${index}`} 
                                        className="px-4 py-3 text-left font-medium border-b border-border bg-muted/50 backdrop-blur-sm"
                                        style={{ width: '150px', minWidth: '150px' }}
                                    >
                                        <button
                                            onClick={() => handleSort(header)}
                                            className="flex items-center gap-2 hover:text-primary transition-colors group w-full text-left"
                                        >
                                            <span className="truncate">{header}</span>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                {getSortIcon(header)}
                                            </div>
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, rowIndex) => (
                                <tr 
                                    key={startIndex + rowIndex} 
                                    className="border-b border-border hover:bg-muted/30 transition-colors"
                                >
                                    {visibleHeaders.map((header, cellIndex) => {
                                        const value = row[header];
                                        return (
                                            <td 
                                                key={`${startIndex + rowIndex}-${cellIndex}`} 
                                                className={cn(
                                                    "px-4 py-3 text-sm border-r border-border last:border-r-0",
                                                    getCellClassName(value)
                                                )}
                                                style={{ width: '150px', minWidth: '150px' }}
                                            >
                                                <div className="truncate" title={String(value || '')}>
                                                    {formatCellValue(value)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            
                            {/* Empty state for current page */}
                            {paginatedData.length === 0 && searchTerm && (
                                <tr>
                                    <td colSpan={visibleHeaders.length} className="py-8 text-center text-muted-foreground">
                                        <div className="space-y-2">
                                            <p>No results found for "{searchTerm}"</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setSearchTerm('')}
                                            >
                                                Clear search
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex-shrink-0 border-t bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, processedData.length)} of {processedData.length.toLocaleString()} rows
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className="w-8 h-8 p-0"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
