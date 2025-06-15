
import React from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  if (!text || text.trim() === '') {
    return null;
  }

  const elements: JSX.Element[] = [];
  const lines = text.split('\n');

  // Function to process bold tags within a string segment
  const renderWithBold = (segment: string, keyPrefix: string): React.ReactNode[] => {
    return segment.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0).map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-strong-${partIndex}`}>{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    // Treat every line as a paragraph; empty lines will create empty <p> tags with margins,
    // which effectively creates a visual gap if the AI outputs an empty line.
    elements.push(
      <p key={`p-${index}`} className="my-1">
        {renderWithBold(line, `p-${index}`)}
      </p>
    );
  });

  if (elements.length === 0) {
    return null;
  }

  return <>{elements}</>;
};

export default MarkdownRenderer;
