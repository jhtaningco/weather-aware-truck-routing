import { createTheme } from '@mui/material/styles';

/**
 * Minimal Phase 0 theme: font and brand color only.
 * The full token set (palette, risk colors, shape, spacing) is added in Phase 4.
 */
export const theme = createTheme({
  palette: {
    primary: { main: '#465FFF' },
    background: { default: '#F9FAFB', paper: '#FFFFFF' },
    text: { primary: '#101828', secondary: '#667085' },
  },
  typography: {
    fontFamily: '"Outfit", system-ui, sans-serif',
    h6: { fontWeight: 600 },
  },
});
