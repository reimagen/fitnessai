
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

  // Regex to detect day headings like "**Monday: Upper Body**"
  const dayHeadingRegex = /^\*\*(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):.*?\*\*/;

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
    // Check if the current line is a day heading and it's not the first line of the plan
    if (index > 0 && dayHeadingRegex.test(line)) {
      // Add an extra paragraph for spacing before a new day's heading
      elements.push(<p key={`spacer-${index}`} className="my-2"></p>);
    }

    // Render the current line as a paragraph
    // Even if the line is empty, it will be rendered as <p class="my-1"></p>, creating some space.
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
