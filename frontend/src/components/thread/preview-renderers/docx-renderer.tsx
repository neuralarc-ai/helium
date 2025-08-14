'use client';

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';

interface DocxRendererProps {
  fileUrl: string;
}

const DocxRenderer: React.FC<DocxRendererProps> = ({ fileUrl }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const convertDocxToHtml = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch (err) {
        console.error('Error converting DOCX to HTML:', err);
        setError('Failed to load document preview.');
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl) {
      convertDocxToHtml();
    }
  }, [fileUrl]);

  if (loading) {
    return <div className="p-4">Loading document...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div
      className="docx-preview prose p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default DocxRenderer;
