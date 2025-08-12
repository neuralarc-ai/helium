'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
    ChevronUp, 
    ChevronDown, 
    FileSpreadsheet,
    ArrowUpDown,
    Filter,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';

interface XlsxRendererProps {
    content: string | null;
    binaryUrl: string | null;
    fileName: string;
    className?: string;
    demoData?: SheetData[]; // For demo/testing purposes
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
    column: string;
    direction: SortDirection;
}

interface SheetData {
    name: string;
    data: any[][];
    headers: string[];
}

interface CellData {
    value: any;
    type: 'string' | 'number' | 'boolean' | 'date' | 'formula';
    formattedValue: string;
}

async function parseXLSX(content: string | null, binaryUrl: string | null): Promise<SheetData[]> {
    if (!content && !binaryUrl) return [];

    try {
        let workbook: XLSX.WorkBook;
        
        if (binaryUrl) {
            // Handle binary URL (for uploaded files)
            const response = await fetch(binaryUrl);
            const buffer = await response.arrayBuffer();
            workbook = XLSX.read(buffer, { type: 'array' });
            return processWorkbook(workbook);
        } else if (content) {
            // Handle base64 content
            const binaryString = atob(content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            workbook = XLSX.read(bytes, { type: 'array' });
            return processWorkbook(workbook);
        }
        
        return [];
    } catch (error) {
        console.error("Error parsing XLSX:", error);
        return [];
    }
}

function processWorkbook(workbook: XLSX.WorkBook): SheetData[] {
    const sheets: SheetData[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
            const headers = jsonData[0] as string[];
            const data = jsonData.slice(1) as any[][];
            
            sheets.push({
                name: sheetName,
                data,
                headers
            });
        }
    });
    
    return sheets;
}

function getCellData(value: any): CellData {
    if (value == null || value === '') {
        return { value: '', type: 'string', formattedValue: '' };
    }
    
    if (typeof value === 'number') {
        return {
            value,
            type: 'number',
            formattedValue: value.toLocaleString()
        };
    }
    
    if (typeof value === 'boolean') {
        return {
            value,
            type: 'boolean',
            formattedValue: value ? 'TRUE' : 'FALSE'
        };
    }
    
    if (value instanceof Date) {
        return {
            value,
            type: 'date',
            formattedValue: value.toLocaleDateString()
        };
    }
    
    // Check if it's a formula (starts with =)
    if (typeof value === 'string' && value.startsWith('=')) {
        return {
            value,
            type: 'formula',
            formattedValue: value
        };
    }
    
    return {
        value,
        type: 'string',
        formattedValue: String(value)
    };
}

export function XlsxRenderer({
    content,
    binaryUrl,
    fileName,
    className,
    demoData
}: XlsxRendererProps) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

    const [activeSheet, setActiveSheet] = useState(0);
    const [zoom, setZoom] = useState(100);
    const [selectedCell, setSelectedCell] = useState<string>('A1');
    const [formulaBarValue, setFormulaBarValue] = useState('');
    const [sheets, setSheets] = useState<SheetData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const currentSheet = sheets[activeSheet];
    
    // Parse XLSX content when content or binaryUrl changes, or use demo data
    useEffect(() => {
        const loadSheets = async () => {
            setIsLoading(true);
            try {
                let parsedSheets: SheetData[];
                
                if (demoData) {
                    // Use demo data if provided
                    parsedSheets = demoData;
                } else {
                    // Parse actual XLSX content
                    parsedSheets = await parseXLSX(content, binaryUrl);
                }
                
                setSheets(parsedSheets);
                if (parsedSheets.length > 0) {
                    setActiveSheet(0);
                }
            } catch (error) {
                console.error('Error loading XLSX:', error);
                setSheets([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSheets();
    }, [content, binaryUrl, demoData]);
    
    const isEmpty = !currentSheet || currentSheet.data.length === 0;

    const processedData = useMemo(() => {
        if (!currentSheet) return [];
        
        let filtered = currentSheet.data;

        if (sortConfig.column && sortConfig.direction) {
            const columnIndex = currentSheet.headers.indexOf(sortConfig.column);
            if (columnIndex !== -1) {
                filtered = [...filtered].sort((a: any[], b: any[]) => {
                    const aVal = a[columnIndex];
                    const bVal = b[columnIndex];
                    
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
        }

        return filtered;
    }, [currentSheet, sortConfig]);

    // Early return for loading state - AFTER all hooks
    if (isLoading) {
        return (
            <div className={cn('w-full h-full flex items-center justify-center', className)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-foreground">Loading XLSX...</h3>
                        <p className="text-sm text-muted-foreground">Please wait while we parse your spreadsheet.</p>
                    </div>
                </div>
            </div>
        );
    }

    const paginatedData = processedData;
    const startIndex = 0;

    const visibleHeaders = currentSheet?.headers.filter(header => !hiddenColumns.has(header)) || [];

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

    const getColumnLetter = (index: number): string => {
        let result = '';
        while (index >= 0) {
            result = String.fromCharCode(65 + (index % 26)) + result;
            index = Math.floor(index / 26) - 1;
        }
        return result;
    };

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        const rowNum = rowIndex + 2; // +2 because row 1 is headers, data starts at row 2
        const colLetter = getColumnLetter(colIndex);
        const cellRef = `${colLetter}${rowNum}`;
        setSelectedCell(cellRef);
        
        const cellValue = paginatedData[rowIndex]?.[colIndex];
        setFormulaBarValue(cellValue?.toString() || '');
    };

    const handleFormulaBarChange = (value: string) => {
        setFormulaBarValue(value);
    };

    const handleFormulaBarKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // In a real implementation, this would update the cell value
            console.log('Updating cell:', selectedCell, 'with value:', formulaBarValue);
        }
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
                        <p className="text-sm text-muted-foreground">This XLSX file appears to be empty or invalid.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('w-full h-full flex flex-col bg-background', className)}>
            {/* Excel-like Header */}
            <div className="flex-shrink-0 border-b border-gray-300 bg-gray-50 p-4 space-y-3">
                {/* File Info and Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">X</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-800 font-geist-sans">{fileName.split('/').pop() || fileName}</h3>
                            <p className="text-xs text-gray-500 font-geist-sans">
                                Last modified: {new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                    
                </div>

                {/* Formula Bar */}
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1">
                    <span className="text-sm font-geist-mono text-gray-700 min-w-[40px] bg-gray-100 px-2 py-1 rounded border border-gray-300 text-center">{selectedCell}</span>
                    <Input
                        value={formulaBarValue}
                        onChange={(e) => handleFormulaBarChange(e.target.value)}
                        onKeyDown={handleFormulaBarKeyDown}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 text-sm bg-transparent font-geist-sans"
                        placeholder="Enter a value or formula"
                    />
                </div>


            </div>

            {/* Sheet Tabs */}
            {sheets.length > 1 && (
                <div className="flex-shrink-0 border-b border-gray-300 bg-gray-100 px-4">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Tabs value={activeSheet.toString()} onValueChange={(value) => setActiveSheet(parseInt(value))}>
                            <TabsList className="h-8 bg-transparent">
                                {sheets.map((sheet, index) => (
                                    <TabsTrigger
                                        key={sheet.name}
                                        value={index.toString()}
                                        className="h-8 px-3 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-800 font-geist-sans"
                                    >
                                        {sheet.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Spreadsheet Grid */}
            <div className="flex-1 overflow-hidden bg-white">
                <div 
                    className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                >
                                         <table className="border-collapse font-geist-sans" style={{ minWidth: `${Math.max(visibleHeaders.length * 150, 2000)}px`, minHeight: `${Math.max(processedData.length * 40, 2000)}px` }}>
                         <thead className="sticky top-0 z-20">
                             {/* Column Headers Row - Only Column Letters (A, B, C, D) */}
                             <tr>
                                 <th className="w-12 h-8 bg-gray-100 border-r border-b-1 border-gray-300 sticky top-0 left-0 z-50"></th>
                                 {visibleHeaders.map((header, index) => (
                                     <th 
                                         key={header} 
                                         className="px-4 py-2 text-center font-semibold border-r border-b-1 border-gray-300 bg-gray-100 text-gray-700 text-sm sticky top-0"
                                         style={{ width: '150px', minWidth: '150px' }}
                                     >
                                         <span className="text-sm font-mono text-gray-700">{getColumnLetter(index)}</span>
                                     </th>
                                 ))}
                                 {/* Infinite columns - Only Column Letters */}
                                 {Array.from({ length: 50 }, (_, i) => (
                                     <th 
                                         key={`empty-${i}`} 
                                         className="px-4 py-2 text-center font-semibold border-r border-b-2 border-gray-300 bg-gray-100 text-gray-700 text-sm sticky top-0"
                                         style={{ width: '150px', minWidth: '150px' }}
                                     >
                                         <span className="text-sm font-mono text-gray-700">{getColumnLetter(visibleHeaders.length + i)}</span>
                                     </th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody>
                             {/* Column Headers Row - Shows actual column names */}
                             <tr className="bg-white">
                                 <td className="w-12 h-8 bg-gray-100 border-b border-r border-gray-300 sticky top-0 left-0 z-10 text-center text-xs text-gray-700 font-geist-mono">
                                     1
                                 </td>
                                 {visibleHeaders.map((header, index) => (
                                     <td 
                                         key={header} 
                                         className="px-4 py-2 text-left font-semibold border-r border-b border-gray-300 bg-white text-gray-700 text-sm"
                                         style={{ width: '150px', minWidth: '150px' }}
                                     >
                                         <button
                                             onClick={() => handleSort(header)}
                                             className="flex items-center gap-2 hover:text-blue-600 transition-colors group w-full text-left"
                                         >
                                             <span className="truncate">{header}</span>
                                             <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                 {getSortIcon(header)}
                                             </div>
                                         </button>
                                     </td>
                                 ))}
                                 {/* Empty cells for header row */}
                                 {Array.from({ length: 50 }, (_, i) => (
                                     <td 
                                         key={`header-empty-${i}`} 
                                         className="px-4 py-2 text-sm border-r border-b border-gray-300 bg-white text-gray-700"
                                         style={{ width: '150px', minWidth: '150px' }}
                                     >
                                         <span className="text-gray-400">Column {getColumnLetter(visibleHeaders.length + i)}</span>
                                     </td>
                                 ))}
                             </tr>
                             
                             {/* Data Rows with Headers and Data */}
                             {paginatedData.map((row: any[], rowIndex) => (
                                 <tr 
                                     key={startIndex + rowIndex} 
                                     className="hover:bg-gray-50 transition-colors"
                                 >
                                     {/* Row Number - Fixed Left */}
                                     <td className="w-12 h-8 bg-gray-100 border-b border-r border-gray-300 sticky left-0 z-10 text-center text-xs text-gray-700 font-geist-mono">
                                         {rowIndex + 2}
                                     </td>
                                     
                                     {/* Data Cells with Headers */}
                                     {visibleHeaders.map((header, cellIndex) => {
                                         const value = row[cellIndex];
                                         const cellData = getCellData(value);
                                         const isSelected = selectedCell === `${getColumnLetter(cellIndex)}${rowIndex + 2}`;
                                         const isSelectedColumn = selectedCell.startsWith(getColumnLetter(cellIndex));
                                         
                                         return (
                                             <td 
                                                 key={`${startIndex + rowIndex}-${cellIndex}`} 
                                                 className={cn(
                                                     "px-4 py-2 text-sm border-r border-b border-gray-300 cursor-pointer transition-all relative text-gray-900",
                                                     getCellClassName(cellData),
                                                     isSelected && "ring-2 ring-green-500 ring-inset bg-green-50",
                                                     isSelectedColumn && !isSelected && "bg-gray-50"
                                                 )}
                                                 style={{ width: '150px', minWidth: '150px' }}
                                                 onClick={() => handleCellClick(rowIndex, cellIndex)}
                                                 title={cellData.formattedValue}
                                             >
                                                 <div className="truncate">
                                                     {cellData.formattedValue}
                                                 </div>
                                             </td>
                                         );
                                     })}
                                     
                                     {/* Infinite empty cells */}
                                     {Array.from({ length: 50 }, (_, i) => (
                                         <td 
                                             key={`empty-${i}`} 
                                             className="px-4 py-2 text-sm border-r border-b border-gray-300 cursor-pointer transition-all relative text-gray-900"
                                             style={{ width: '150px', minWidth: '150px' }}
                                             onClick={() => handleCellClick(rowIndex, visibleHeaders.length + i)}
                                         >
                                             <div className="truncate"></div>
                                         </td>
                                     ))}
                                 </tr>
                             ))}
                             
                             {/* Infinite empty rows */}
                             {Array.from({ length: 100 }, (_, i) => (
                                 <tr key={`empty-row-${i}`} className="hover:bg-gray-50 transition-colors">
                                     <td className="w-12 h-8 bg-gray-100 border-b border-r border-gray-300 sticky left-0 z-20 text-center text-xs text-gray-700 font-geist-mono">
                                         {paginatedData.length + i + 2}
                                     </td>
                                     
                                     {/* Empty cells for this row */}
                                     {Array.from({ length: visibleHeaders.length + 50 }, (_, j) => (
                                         <td 
                                             key={`empty-cell-${i}-${j}`} 
                                             className="px-4 py-2 text-sm border-r border-b border-gray-300 cursor-pointer transition-all relative text-gray-900"
                                             style={{ width: '150px', minWidth: '150px' }}
                                             onClick={() => handleCellClick(paginatedData.length + i, j)}
                                         >
                                             <div className="truncate"></div>
                                         </td>
                                     ))}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                </div>
            </div>

            {/* Status Bar and Controls */}
            <div className="flex-shrink-0 bg-green-800 p-3">
                <div className="flex items-center justify-between">
                    {/* Left side - Status */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-green-100 font-geist-sans">Ready</span>
                        <span className="text-sm text-green-200 font-geist-sans">
                            {processedData.length.toLocaleString()} rows, {visibleHeaders.length} columns
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getCellClassName(cellData: CellData): string {
    if (cellData.type === 'number') {
        return 'text-right font-mono';
    }
    if (cellData.type === 'boolean') {
        return cellData.value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }
    if (cellData.type === 'date') {
        return 'text-blue-600 dark:text-blue-400';
    }
    if (cellData.type === 'formula') {
        return 'text-purple-600 dark:text-purple-400 font-mono';
    }
    return '';
} 
