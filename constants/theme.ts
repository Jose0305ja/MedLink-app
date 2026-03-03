export type AppThemeColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  pillBg: string;
};

export const lightColors: AppThemeColors = {
  background: '#F7F9FC',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#667085',
  border: '#E5ECF6',
  primary: '#2F6BFF',
  pillBg: 'rgba(47,107,255,0.10)',
};

export const darkColors: AppThemeColors = {
  background: '#0B1220',
  card: '#111A2E',
  text: '#EAF0FF',
  subtext: 'rgba(234,240,255,0.65)',
  border: 'rgba(234,240,255,0.12)',
  primary: '#4C83FF',
  pillBg: 'rgba(76,131,255,0.18)',
};
