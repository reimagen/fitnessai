
import React from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  if (!text || text.trim() === '') {
    return null;
  }

  const elements: JSX.Element[] = [];
  let currentListItems: JSX.Element[] = [];

  const lines = text.split('\n');

  const flushList = (keySuffix: string | number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${keySuffix}`} className="list-disc list-inside pl-5 my-2 space-y-1">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  // Regex to match list item markers like "* ", "- ", or just "*" or "-" at the start of a line,
  // potentially with leading/trailing whitespace around the marker.
  const listItemRegex = /^\s*([*-])\s*(.*)/;

  lines.forEach((line, index) => {
    // Function to process bold tags within a string segment
    const renderWithBold = (segment: string, keyPrefix: string): React.ReactNode[] => {
      return segment.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${keyPrefix}-strong-${partIndex}`}>{part.substring(2, part.length - 2)}</strong>;
        }
        return part;
      });
    };

    const listMatch = line.match(listItemRegex);

    if (listMatch) {
      // const marker = listMatch[1]; // Captured '*' or '-'
      const listItemContent = listMatch[2]; // The content of the list item (after the marker and any space)
      currentListItems.push(
        <li key={`li-${index}`}>
          {renderWithBold(listItemContent, `li-${index}`)}
        </li>
      );
    } else {
      flushList(index); // Finalize any list before processing a non-list line
      if (line.trim() !== '') {
        elements.push(
          <p key={`p-${index}`} className="my-1">
            {renderWithBold(line, `p-${index}`)}
          </p>
        );
      } else {
        // Empty lines can act as paragraph separators if surrounded by content with margins.
      }
    }
  });

  flushList('last'); // Finalize any remaining list at the end of the text

  if (elements.length === 0 && text.trim() !== '') {
    // Fallback for text that might not produce structured elements but isn't just whitespace
    // and wasn't processed as list items (e.g. single line of text)
    return (
      <div className="whitespace-pre-wrap">
        {text.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0).map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`fallback-strong-${partIndex}`}>{part.substring(2, part.length - 2)}</strong>;
          }
          return part;
        })}
      </div>
    );
  }
  
  if (elements.length === 0 && currentListItems.length === 0 && text.trim() === '') {
    return null; // Return null if text is effectively empty after processing
  }


  return <>{elements}</>;
};

export default MarkdownRenderer;
```