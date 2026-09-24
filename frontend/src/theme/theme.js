import { createTheme } from '@mui/material/styles';

// TrustLab Smart Report palette (same tokens as the Studio's printed report)
export const tl = {
  teal: '#00B49A',
  tealDark: '#008F7A',
  forest: '#1A3A2A',
  saffron: '#F0B429',
  ink: '#17201C',
  ink2: '#4A5A52',
  ink3: '#7A8A82',
  cream: '#FBF9F3',
  line: '#E3E8E5',
  line2: '#CDD6D1',
  bg: '#F2F4F3',
  mono: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  display: '"Bebas Neue", "Oswald", "Arial Narrow", Impact, sans-serif',
};

// normal / borderline / attention / not classified
export const status = {
  normal: { fg: '#1E9E4A', bg: '#E4F5EA', word: 'Optimal' },
  borderline: { fg: '#E39A0F', bg: '#FCF1D6', word: 'Borderline' },
  attention: { fg: '#C8342B', bg: '#FBE4E1', word: 'Needs attention' },
  na: { fg: '#7A8A82', bg: '#EEF0EF', word: 'Reported' },
};

// gauge segment colour per band
export const bandColor = { lo: status.attention.fg, blo: status.borderline.fg, n: status.normal.fg, bhi: status.borderline.fg, hi: status.attention.fg };

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tl.teal, dark: tl.tealDark, contrastText: '#fff' },
    secondary: { main: tl.forest, contrastText: '#fff' },
    success: { main: status.normal.fg },
    warning: { main: status.borderline.fg },
    error: { main: status.attention.fg },
    text: { primary: tl.ink, secondary: tl.ink2 },
    divider: tl.line,
    background: { default: tl.bg, paper: '#fff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.01em', color: tl.forest },
    h2: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.01em', color: tl.forest },
    h3: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.02em', color: tl.forest },
    h4: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.02em', color: tl.forest },
    h5: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.03em', color: tl.forest },
    h6: { fontFamily: tl.display, fontWeight: 400, letterSpacing: '0.03em', color: tl.forest },
    overline: { fontFamily: tl.mono, letterSpacing: '0.16em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: tl.line } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export default theme;
