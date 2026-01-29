
import React from 'react';
import { TANK_VISUALS } from '../constants';

interface TankIconProps {
    tankId: string;
    color: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const TankIcon: React.FC<TankIconProps> = ({ tankId, color, size = 24, className = "", style = {} }) => {
    const visual = TANK_VISUALS[tankId] || TANK_VISUALS['assault'];
    
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            className={className} 
            style={style}
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <g transform="translate(50, 50)">
                {/* Treads / Chassis Detail - Darker */}
                <path d={visual.treads} fill="#334155" />
                
                {/* Main Body - Player Color */}
                <path d={visual.body} fill={color} stroke="#1e293b" strokeWidth="2" />
                
                {/* Barrel - Dark Grey */}
                <path d={visual.barrel} fill="#475569" stroke="#1e293b" strokeWidth="2" />
                
                {/* Turret - Lighter Grey/Metallic */}
                <path d={visual.turret} fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
                
                {/* Turret Detail/Highlight */}
                {visual.detail && <path d={visual.detail} fill={color} fillOpacity="0.5" />}
            </g>
        </svg>
    );
};
