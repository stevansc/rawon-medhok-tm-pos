import React, { ReactNode } from 'react';
import { useModalBackButton } from '../hooks/useModalBackButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Tailwind classes to apply to the innermost modal container
   */
  className?: string;
  /**
   * Tailwind classes to apply to the dark backdrop container
   */
  backdropClassName?: string;
}

/**
 * A globally shared Modal wrapper that automatically protects against 
 * mobile hardware back-button navigation out of the app.
 */
export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = "bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-slide-up",
  backdropClassName = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in"
}: ModalProps) {
  
  // Inject the global hardware back button interceptor!
  useModalBackButton(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className={backdropClassName}>
      <div className={className}>
        {children}
      </div>
    </div>
  );
}
