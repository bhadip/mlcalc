/**
 * TypeScript interfaces for the MLCalc frontend.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'visitor' | 'user' | 'admin';
  is_approved: boolean;
  avatar_url?: string;
}

export interface Position {
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  open_price: number;
  current_price?: number;
  profit?: number;
  swap?: number;
  commission?: number;
}

export interface ExtractedAccountData {
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level_percent?: number;
  credit: number;
  positions: Position[];
  raw_ocr_text?: string;
  confidence?: number;
  validation_passed: boolean;
  validation_errors: string[];
}

export interface Screenshot {
  id: string;
  user_id: string;
  filename: string;
  file_size_bytes: number;
  content_type: string;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data?: ExtractedAccountData;
  shared_with?: {
    user_ids: string[];
    is_public: boolean;
    share_token: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LiquidationPriceResponse {
  is_stopped_out: boolean;
  stopped_out_reason?: string;
  margin_level_percent?: number;
  liquidation_price?: number;
  equity?: number;
  floating_pl?: number;
  details?: Record<string, any>;
}

export interface BalanceAdjustmentResponse {
  is_stopped_out: boolean;
  stopped_out_reason?: string;
  balance_required?: number;
  additional_deposit?: number;
  floating_pl_at_target?: number;
  equity_at_target?: number;
  margin_level_at_target?: number;
  details?: Record<string, any>;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  category: string;
  contract_size: number;
  tick_size: number;
  tick_value: number;
  margin_currency: string;
  leverage?: number;
  stop_out_percent?: number;
  description?: string;
  is_active: boolean;
}

export interface BrandingConfig {
  app_name: string;
  tagline: string;
  logo: {
    light: string;
    dark: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    danger: string;
    success: string;
  };
  features: {
    ocr_enabled: boolean;
    auth_required_for_save: boolean;
    visitor_calc_limit: number;
    show_audit_log: boolean;
  };
  broker_defaults: {
    stop_out_percent: number;
    margin_call_percent: number;
    default_leverage: number;
  };
}
