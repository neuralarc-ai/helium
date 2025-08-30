'use client';

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import parse, { domToReact, HTMLReactParserOptions, DOMNode } from 'html-react-parser';

interface DocxRendererProps {
  url: string;
  accessToken?: string;
}

const DocxRenderer: React.FC<DocxRendererProps> = ({ url, accessToken }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const convertDocxToHtml = async () => {
      if (!url) return;
      setLoading(true);
      setError(null);
      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const styleMap = [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "b => strong",
        ];

        const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap });
        setHtml(result.value);
      } catch (err) {
        console.error('Error converting DOCX to HTML:', err);
        setError('Failed to load document preview.');
      } finally {
        setLoading(false);
      }
    };

    convertDocxToHtml();
  }, [url, accessToken]);

  if (loading) {
    return <div className="p-4">Loading document...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode.type === 'tag') {
        const { name, children } = domNode;
        const props = { children: domToReact(children as DOMNode[], options) };

        switch (name) {
          case 'h1':
            return <h1 className="text-2xl font-bold my-4 libre-baskerville-bold" {...props} />;
          case 'h2':
            return <h2 className="text-xl font-bold my-3" {...props} />;
          case 'h3':
            return <h3 className="text-lg font-bold my-2" {...props} />;
          case 'p':
            return <p className="my-2" {...props} />;
          case 'ul':
            return <ul className="list-disc list-inside my-2" {...props} />;
          case 'ol':
            return <ol className="list-decimal list-inside my-2" {...props} />;
          case 'li':
            return <li className="my-1" {...props} />;
          case 'strong':
            return <strong className="font-bold" {...props} />;
          case 'em':
            return <em className="italic" {...props} />;
          case 'blockquote':
            return <blockquote className="border-l-4 border-muted pl-4 italic my-2" {...props} />;
          default:
            return domNode;
        }
      }
    },
  };

  return (
    <div className="p-4 overflow-auto">
      <div className="prose dark:prose-invert max-w-none break-words">
        {parse(html, options)}
      </div>
    </div>
  );
};

export default DocxRenderer;
