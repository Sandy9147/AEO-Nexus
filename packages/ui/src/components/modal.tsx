import * as React from 'react';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">{title}</h2>
            {description && <p className="text-sm text-[#64748B] mt-0.5">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>

        <div className="py-4 text-[#1E293B]">{children}</div>

        {footer && (
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E2E8F0]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
