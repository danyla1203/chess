// src/components/Dropdown.tsx
import React, { useState } from 'react';

interface DropdownProps {
  label: string;
  children: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-500 text-white px-2 py-1 rounded-md"
        >
          {label}
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute w-full right-0 mt-1 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {React.Children.map(children, (child) => (
              <>{child}</>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
