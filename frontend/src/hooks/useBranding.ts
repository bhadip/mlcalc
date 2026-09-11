/**
 * useBranding hook — Fetches branding config from backend and applies it dynamically.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '@/api/client';
import { BrandingConfig } from '@/types';

const defaultBranding: BrandingConfig = {
  app_name: 'MLCalc',
  tagline: 'Margin Level Calculator',
  logo: { light: '', dark: '' },
  colors: {
    primary: '#06b6d4',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    danger: '#ef4444',
    success: '#10b981',
  },
  features: {
    ocr_enabled: true,
    auth_required_for_save: true,
    visitor_calc_limit: 10,
    show_audit_log: false,
  },
  broker_defaults: {
    stop_out_percent: 50,
    margin_call_percent: 100,
    default_leverage: 100,
  },
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await adminApi.getBranding();
        setBranding(response.data);

        // Apply dynamic branding to document
        document.title = `${response.data.app_name} — ${response.data.tagline}`;
      } catch (err) {
        // Use defaults if fetch fails
        console.warn('Failed to load branding, using defaults');
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { branding, loading };
}
