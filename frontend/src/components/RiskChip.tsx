import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import React from 'react';
import { RISK_LEVELS } from '../types/risk';
import type { RiskLevelOrdinal } from '../types/risk';

interface RiskChipProps extends Omit<ChipProps, 'color'> {
  level: RiskLevelOrdinal;
  showIcon?: boolean;
}

export const RiskChip: React.FC<RiskChipProps> = ({ level, showIcon = true, sx, ...props }) => {
  const spec = RISK_LEVELS[level] ?? RISK_LEVELS[0];

  const renderIcon = () => {
    if (!showIcon) return undefined;
    const iconStyle = { fontSize: 14, color: spec.solid };
    switch (level) {
      case 0:
        return <CheckCircleIcon style={iconStyle} />;
      case 1:
        return <WarningAmberIcon style={iconStyle} />;
      case 2:
        return <WarningAmberIcon style={iconStyle} />;
      case 3:
        return <ErrorOutlineOutlinedIcon style={iconStyle} />;
      case 4:
        return <BlockIcon style={iconStyle} />;
    }
  };

  return (
    <Chip
      size="small"
      icon={renderIcon()}
      label={spec.label}
      sx={{
        backgroundColor: spec.soft,
        color: spec.solid,
        border: `1px solid ${spec.solid}33`,
        fontWeight: 600,
        fontSize: '0.75rem',
        height: 24,
        '& .MuiChip-icon': {
          marginLeft: '6px',
        },
        ...sx,
      }}
      {...props}
    />
  );
};
