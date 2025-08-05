import React, { useState } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from '@/components/ui/dialog';

interface WaitlistFormProps {
  isOpen: boolean;
  onClose: () => void;
}

// List of personal email providers to reject
const PERSONAL_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
  'tutanota.com', 'mail.com', 'yandex.com', 'zoho.com', 'fastmail.com',
  'gmx.com', 'web.de', 't-online.de', 'orange.fr', 'laposte.net',
  'libero.it', 'virgilio.it', 'terra.com.br', 'uol.com.br', 'bol.com',
  'telenet.be', 'skynet.be', 'tiscali.it', 'alice.it', 'tin.it',
  'mail.ru', 'rambler.ru', 'bk.ru', 'list.ru', 'inbox.ru',
  'rediffmail.com', 'sify.com', 'indiatimes.com', 'rediff.com',
  'rocketmail.com', 'msn.com', 'windowslive.com', 'live.co.uk',
  'btinternet.com', 'virginmedia.com', 'sky.com', 'talktalk.net',
  'ntlworld.com', 'blueyonder.co.uk', 'tiscali.co.uk', 'orange.net',
  'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'bouygtel.fr',
  'numericable.fr', 'neuf.fr', 'club-internet.fr', 'voila.fr',
  'aliceadsl.fr', 'tele2.fr', 'noos.fr', 'cegetel.fr', '9online.fr',
  'libertysurf.fr', 'infonie.fr', 'easynet.fr', 'worldonline.fr',
  'chello.nl', 'planet.nl', 'hetnet.nl', 'xs4all.nl', 'casema.nl',
  'ziggo.nl', 'kpn.nl', 'online.nl', 'telfort.nl', 'versatel.nl',
  'chello.be', 'telenet.be', 'skynet.be', 'belgacom.be', 'scarlet.be',
  'proximus.be', 'mobistar.be', 'base.be', 'orange.be'
];

// Zod schema for validation
const WaitlistSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  companyEmail: z.string()
    .min(1, 'Company email is required')
    .email('Please enter a valid email address')
    .refine((email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) return false;
      
      // Check for personal email providers
      if (PERSONAL_EMAIL_PROVIDERS.includes(domain)) {
        return false;
      }
      
      // Additional checks for common personal email patterns
      if (domain.includes('personal') || 
          domain.includes('private') || 
          domain.includes('home') ||
          domain.includes('family') ||
          domain.includes('individual')) {
        return false;
      }
      
      return true;
    }, 'Please use a company email address.')
});

export default function WaitlistForm({ isOpen, onClose }: WaitlistFormProps) {
  const [name, setName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Validation functions
  const validateName = (value: string) => {
    try {
      WaitlistSchema.shape.name.parse(value);
      setNameError('');
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setNameError(err.errors[0].message);
      }
      return false;
    }
  };

  const validateEmail = (value: string) => {
    try {
      WaitlistSchema.shape.companyEmail.parse(value);
      setEmailError('');
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setEmailError(err.errors[0].message);
      }
      return false;
    }
  };

  // Test backend connectivity
  const testBackendConnection = async () => {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Remove trailing slash if present
    backendUrl = backendUrl.replace(/\/$/, '');
    
    // If the backend URL already contains /api, remove it to avoid duplication
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.replace(/\/api$/, '');
    }
    
    const healthUrl = `${backendUrl}/api/health`;
    
    try {
      console.log('Testing backend connection to:', healthUrl);
      const res = await fetch(healthUrl);
      const data = await res.json();
      console.log('Backend health check response:', data);
      alert(`Backend is accessible! Status: ${res.status}`);
    } catch (err: any) {
      console.error('Backend connection test failed:', err);
      alert(`Backend connection failed: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate both fields
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(companyEmail);
    
    if (!isNameValid || !isEmailValid) {
      setError('Please fix the validation errors above.');
      return;
    }
    setLoading(true);
    try {
      // Call the backend API instead of Next.js API route
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Remove trailing slash if present
      backendUrl = backendUrl.replace(/\/$/, '');
      
      // If the backend URL already contains /api, remove it to avoid duplication
      if (backendUrl.endsWith('/api')) {
        backendUrl = backendUrl.replace(/\/api$/, '');
      }
      
      const apiUrl = `${backendUrl}/api/waitlist`;
      console.log('Submitting to:', apiUrl);
      console.log('Backend URL:', backendUrl);
      console.log('Environment variable:', process.env.NEXT_PUBLIC_BACKEND_URL);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyEmail }),
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      
      let data;
      try {
        data = await res.json();
        console.log('Response data:', data);
        console.log('Response data type:', typeof data);
        console.log('Response data keys:', Object.keys(data));
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        const textResponse = await res.text();
        console.log('Text response:', textResponse);
        throw new Error(`Server returned invalid JSON. Status: ${res.status}`);
      }
      
      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        
        // Handle validation errors (422 status)
        if (res.status === 422 && data?.detail) {
          if (Array.isArray(data.detail)) {
            // Multiple validation errors - FastAPI format
            errorMessage = data.detail.map((err: any) => {
              let msg = '';
              if (err.msg) msg = err.msg;
              else if (err.message) msg = err.message;
              else if (typeof err === 'string') msg = err;
              else msg = JSON.stringify(err);
              
              // Remove "Value error, " prefix if present
              return msg.replace(/^Value error,\s*/i, '');
            }).join(', ');
          } else {
            // Single validation error
            errorMessage = data.detail;
            // Remove "Value error, " prefix if present
            errorMessage = errorMessage.replace(/^Value error,\s*/i, '');
          }
        } else if (data?.error) {
          errorMessage = data.error;
          // Remove "Value error, " prefix if present
          errorMessage = errorMessage.replace(/^Value error,\s*/i, '');
        } else if (data?.detail) {
          errorMessage = data.detail;
          // Remove "Value error, " prefix if present
          errorMessage = errorMessage.replace(/^Value error,\s*/i, '');
        }
        
        throw new Error(errorMessage);
      }
      
      setSubmitted(true);
    } catch (err: any) {
      console.error('Waitlist submission error:', err);
      
      // Provide more specific error messages
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else if (err.message.includes('CORS')) {
        setError('CORS error. Please check server configuration.');
      } else {
        setError(err.message || 'Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogOverlay className="bg-white/10 backdrop-blur-none" />
      <DialogContent className="bg-card rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/10">
        {/* DialogClose already provides a close button, so we remove the manual one */}
        {!submitted && (
          <>
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Join the Waitlist</h2>
          </>
        )}
        {submitted ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <svg width="48" height="48" fill="none" viewBox="0 0 48 48" className="mb-4">
              <circle cx="24" cy="24" r="24" fill="#36BDA0"/>
              <path d="M16 25l6 6 10-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="text-2xl font-semibold text-white mb-2">Thank you!</h3>
            <p className="text-white/70 text-base">You're on the waitlist. We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-white/80 mb-1" htmlFor="waitlist-name">Name<span className="text-red-500">*</span></label>
              <input
                id="waitlist-name"
                type="text"
                className={`w-full px-4 py-3 rounded-xl bg-[#232323]/60 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#36BDA0] border ${
                  nameError ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={e => validateName(e.target.value)}
                required
              />
              {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
            </div>
            <div>
              <label className="block text-white/80 mb-1" htmlFor="waitlist-company-email">Company Email<span className="text-red-500">*</span></label>
              <input
                id="waitlist-company-email"
                type="email"
                className={`w-full px-4 py-3 rounded-xl bg-[#232323]/60 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#36BDA0] border ${
                  emailError ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Enter your company email"
                value={companyEmail}
                onChange={e => setCompanyEmail(e.target.value)}
                onBlur={e => validateEmail(e.target.value)}
                required
              />
              {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
              <p className="text-xs text-white/50 mt-1">Only company email addresses are accepted (no Gmail, Yahoo, etc.)</p>
            </div>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <button
              type="submit"
              className="mt-2 px-8 py-3 rounded-2xl bg-white text-black cursor-pointer text-center text-lg font-semibold backdrop-blur-lg hover:bg-white/80 transition-all duration-200 flex items-center justify-center w-full gap-2"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 