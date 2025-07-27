export interface OnboardingConfig {
  id: string;
  title: string;
  description: string | null;
  is_enabled: boolean;
  button_text: string;
  show_on_every_visit: boolean;
  media_type: 'image' | 'video' | null;
  media_url: string | null;
  media_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnboardingConfig;
}

export interface OnboardingAdminProps {
  config: OnboardingConfig | null;
  onUpdate: (config: Partial<OnboardingConfig>) => Promise<void>;
  isLoading: boolean;
}

export interface MediaDisplayProps {
  mediaType: 'image' | 'video' | null;
  mediaUrl: string | null;
  title: string;
}

export interface UpdateOnboardingData {
  title?: string;
  description?: string;
  is_enabled?: boolean;
  button_text?: string;
  show_on_every_visit?: boolean;
  media_type?: 'image' | 'video';
  media_url?: string;
  media_name?: string;
} 