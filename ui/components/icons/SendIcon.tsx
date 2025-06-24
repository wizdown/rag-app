import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SendIcon: React.FC<IconProps> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    aria-hidden="true" // Icons are often decorative
    {...props}
  >
    <path d="M3.105 3.105a.5.5 0 01.814-.39l14.09 6.512a.5.5 0 010 .778L3.92 17.284a.5.5 0 01-.814-.39V3.105z" />
  </svg>
);