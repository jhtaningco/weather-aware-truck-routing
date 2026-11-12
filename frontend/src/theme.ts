import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    border: string;
    primaryTint: string;
    risk: {
      low: { solid: string; soft: string };
      moderate: { solid: string; soft: string };
      high: { solid: string; soft: string };
      severe: { solid: string; soft: string };
      noTravel: { solid: string; soft: string };
    };
    route: {
      recommended: string;
      alt1: string;
      alt2: string;
    };
  }
  interface PaletteOptions {
    border?: string;
    primaryTint?: string;
    risk?: {
      low: { solid: string; soft: string };
      moderate: { solid: string; soft: string };
      high: { solid: string; soft: string };
      severe: { solid: string; soft: string };
      noTravel: { solid: string; soft: string };
    };
    route?: {
      recommended: string;
      alt1: string;
      alt2: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: '#465FFF',
      light: '#ECF3FF',
      contrastText: '#FFFFFF',
    },
    primaryTint: '#ECF3FF',
    border: '#E4E7EC',
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#101828',
      secondary: '#667085',
    },
    risk: {
      low: { solid: '#12B76A', soft: '#ECFDF3' },
      moderate: { solid: '#FDB022', soft: '#FFFAEB' },
      high: { solid: '#F97316', soft: '#FFF4ED' },
      severe: { solid: '#D92D20', soft: '#FEF3F2' },
      noTravel: { solid: '#7A1F1F', soft: '#F4E6E6' },
    },
    route: {
      recommended: '#465FFF',
      alt1: '#475467',
      alt2: '#36BFFA',
    },
  },
  typography: {
    fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#101828',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#101828',
    },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      color: '#101828',
    },
    subtitle2: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: '#667085',
    },
    body1: {
      fontSize: '0.9375rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#101828',
    },
    body2: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#667085',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F9FAFB',
          color: '#101828',
          margin: 0,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E4E7EC',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 44,
          padding: '10px 18px',
          boxShadow: 'none',
          transition: 'all 180ms ease',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(70, 95, 255, 0.2)',
          },
        },
        contained: {
          backgroundColor: '#465FFF',
          '&:hover': {
            backgroundColor: '#3649DE',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 44,
          backgroundColor: '#FFFFFF',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E4E7EC',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D0D5DD',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#465FFF',
            borderWidth: 2,
          },
        },
        input: {
          padding: '10px 14px',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: '0.75rem',
          height: 26,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          height: 38,
          border: '1px solid #E4E7EC',
          color: '#667085',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          '&.Mui-selected': {
            backgroundColor: '#ECF3FF',
            color: '#465FFF',
            borderColor: '#465FFF',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#E0EBFF',
            },
          },
        },
      },
    },
  },
});
