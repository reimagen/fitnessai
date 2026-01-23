import React from 'react';

// Constants
export const RADIAN = Math.PI / 180;

export const stackOrder = ['upperBody', 'lowerBody', 'cardio', 'core', 'fullBody', 'other'] as const;

// Helper function to generate SVG path for rounded rectangles
export const getPath = (x: number, y: number, width: number, height: number, radius: number | number[]) => {
  const [tl, tr, br, bl] = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
  let path = `M ${x + tl},${y}`;
  path += ` L ${x + width - tr},${y}`;
  path += ` Q ${x + width},${y} ${x + width},${y + tr}`;
  path += ` L ${x + width},${y + height - br}`;
  path += ` Q ${x + width},${y + height} ${x + width - br},${y + height}`;
  path += ` L ${x + bl},${y + height}`;
  path += ` Q ${x},${y + height} ${x},${y + height - bl}`;
  path += ` L ${x},${y + tl}`;
  path += ` Q ${x},${y} ${x + tl},${y}`;
  path += ` Z`;
  return path;
};

// Pie chart label renderer
export const renderPieLabel = (props: any, unit?: 'reps' | 'kcal', isMobile: boolean = false) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, value } = props;
  if (percent < 0.05) return null;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const radiusMultiplier = isMobile ? 0.6 : 0.7;
  const labelRadius = innerRadius + (outerRadius - innerRadius) * radiusMultiplier;

  const x = cx + labelRadius * cos;
  const y = cy + labelRadius * sin;

  const displayValue = unit === 'kcal' ? Math.round(value).toLocaleString() : value.toLocaleString();
  const unitString = unit ? ` ${unit}` : '';

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {`${name} (${displayValue}${unitString})`}
    </text>
  );
};

// Custom rounded bar component for bar charts
export const RoundedBar = (props: any) => {
  const { fill, x, y, width, height, payload, dataKey } = props;
  if (!payload || !dataKey || props.value === 0 || height === 0) return null;
  const myIndex = (stackOrder as readonly any[]).indexOf(dataKey as any);
  let isTop = true;
  if (myIndex !== -1) {
    for (let i = myIndex + 1; i < stackOrder.length; i++) {
      if (payload[(stackOrder as readonly any[])[i]] > 0) {
        isTop = false;
        break;
      }
    }
  }
  const radius = isTop ? [4, 4, 0, 0] : [0, 0, 0, 0];
  return <path d={getPath(x, y, width, height, radius)} stroke="none" fill={fill} />;
};
