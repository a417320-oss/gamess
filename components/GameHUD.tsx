
import React from 'react';
import { Player, GameMode, MapConfig, ThemeId } from '../types';
import { TANK_CLASSES, TEXT_DICTIONARY, MAX_FRAGMENTS, THEMES } from '../constants';
import { Shield, Zap, ChevronsRight, CornerUpLeft, Map as MapIcon, Settings } from 'lucide-react';
import { TankIcon } from './TankIcons';

interface GameHUDProps {
    gameMode: GameMode;
    pvePlayerCount: number;
    uiPlayers: Player[];
    uiEnemies: Player[];
    gameTime: number; 
    activeMap: MapConfig | undefined;
    language: 'en' | 'zh';
    theme: ThemeId;
    onSettingsClick?: () => void;
}

interface PlayerStatusProps {
    p: Player;
    isLeft: boolean;
    compactMode: 'none' | 'compact' | 'ultra';
    language: 'en' | 'zh';
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ p, isLeft, compactMode, language }) => {
     const tank = TANK_CLASSES.find(t => t.id === p.tankId) || TANK_CLASSES[0];
     
     const displayName = p.isBot ? (language === 'zh' ? tank?.nameZh : tank?.name) : p.name;
     const classLabel = p.isBot && p.difficulty ? TEXT_DICTIONARY[language][p.difficulty.toLowerCase()] : (language === 'zh' ? tank?.nameZh : tank?.name);

     let widthClass = "w-[450px]";
     let avatarSizeClass = "w-14 h-14";
     let iconSize = 40; // Increased base size for better visibility of new icons
     let nameSizeClass = "text-2xl";
     let gapClass = "gap-4";

     if (compactMode === 'compact') {
         widthClass = "w-[300px]"; avatarSizeClass = "w-12 h-12"; iconSize = 32; nameSizeClass = "text-lg"; gapClass = "gap-3";
     } else if (compactMode === 'ultra') {
         widthClass = "w-[165px]"; avatarSizeClass = "w-10 h-10"; iconSize = 28; nameSizeClass = "text-[10px]"; gapClass = "gap-2";
     }

     return (
        <div className={`flex items-center ${gapClass} ${widthClass} transition-all ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
            {/* Avatar Box */}
            <div className={`${avatarSizeClass} rounded-2xl flex items-center justify-center shadow-xl shrink-0 border-2 border-white/20 relative overflow-hidden`} style={{ backgroundColor: p.color }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="relative z-10 flex items-center justify-center">
                    <TankIcon tankId={p.tankId} color="#fff" size={iconSize} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                </div>
                {p.hasShield && <div className="absolute inset-0 border-4 border-cyan-400 rounded-2xl animate-pulse"></div>}
            </div>

            {/* Info Column */}
            <div className={`flex flex-col flex-1 min-w-0 gap-1.5 ${isLeft ? 'items-start' : 'items-end'}`}>
                 <div className={`flex items-center gap-2.5 w-full ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                     <div className={`font-black ${nameSizeClass} tracking-tight text-white uppercase truncate drop-shadow-md leading-none`}>{displayName}</div>
                     {compactMode !== 'ultra' && (
                        <div className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold border border-white/10 truncate max-w-[90px] leading-tight ${p.isBot ? 'bg-red-900/70 text-red-100' : 'bg-slate-700/70 text-slate-200'}`}>{classLabel}</div>
                     )}
                     
                     {/* Buff Icons - 无论 AI 还是玩家都显示 */}
                     <div className={`flex gap-1.5 h-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                        {p.hasShield && <Shield size={compactMode === 'ultra' ? 12 : 14} className="text-cyan-400" />}
                        {p.buffDamageTimer > 0 && <Zap size={compactMode === 'ultra' ? 12 : 14} className="text-purple-400" />}
                        {p.buffSpeedTimer > 0 && <ChevronsRight size={compactMode === 'ultra' ? 12 : 14} className="text-yellow-400" />}
                        {p.buffRicochetTimer > 0 && <CornerUpLeft size={compactMode === 'ultra' ? 12 : 14} className="text-blue-400" />}
                     </div>
                 </div>

                 {/* Progress Bars */}
                 <div className="w-full flex flex-col gap-1.5">
                     {/* HP Bar */}
                     <div className="w-full h-4 bg-slate-950/70 rounded-lg overflow-hidden border border-white/10 relative">
                         <div className="h-full transition-all duration-300 shadow-inner" style={{ width: `${(p.hp/p.maxHp)*100}%`, backgroundColor: p.hp/p.maxHp < 0.25 ? '#ef4444' : p.color }} />
                         <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">{p.hp}/{p.maxHp} HP</div>
                     </div>
                     
                     <div className={`flex gap-2 w-full h-3 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                         {/* Ammo Bar */}
                         <div className="flex-1 h-full bg-slate-950/70 rounded-full overflow-hidden border border-white/10">
                             {p.isReloading ? (
                                 <div className="h-full bg-orange-500/90 animate-pulse" style={{ width: `${(1 - (p.reloadTimer / p.baseReloadTime)) * 100}%` }} />
                             ) : (
                                 <div className="h-full bg-amber-400/90" style={{ width: `${(p.ammo/p.maxAmmo)*100}%` }} />
                             )}
                         </div>
                         
                         {/* Ult Dots */}
                         {compactMode !== 'ultra' && !p.isBot && (
                             <div className="flex gap-1.5">
                                 {Array.from({length: MAX_FRAGMENTS}).map((_, i) => (
                                     <div key={i} className={`w-3 h-3 rounded-full border border-white/10 ${i < p.fragments ? 'bg-pink-500 shadow-[0_0_8px_#ec4899]' : 'bg-slate-800'}`} />
                                 ))}
                             </div>
                         )}
                     </div>
                 </div>
            </div>
        </div>
     );
};

export const GameHUD: React.FC<GameHUDProps> = ({ gameMode, pvePlayerCount, uiPlayers, uiEnemies, gameTime, activeMap, language, theme, onSettingsClick }) => {
    const isCoop = gameMode === GameMode.PVE && pvePlayerCount === 2;
    const totalSeconds = Math.floor(gameTime / 1000);
    const timeStr = `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
    const themeStyles = THEMES[theme];

    const getMode = (count: number) => {
        if (count <= 1) return 'none';
        if (count === 2) return 'compact';
        return 'ultra';
    };

    return (
        <div className={`h-20 shrink-0 w-full flex items-center justify-between px-10 ${themeStyles.hudBg} border-b border-white/10 z-[60] relative shadow-2xl bg-opacity-95 backdrop-blur-lg`}>
            {/* Left Allies Group */}
            <div className={`absolute top-2.5 left-10 flex ${isCoop ? 'gap-4 flex-row' : 'flex-col gap-1.5'}`}>
                 {uiPlayers[0] && <PlayerStatus p={uiPlayers[0]} isLeft={true} compactMode={getMode(uiPlayers.length)} language={language} />}
                 {uiPlayers[1] && (
                    <div className={isCoop ? "" : "opacity-80 scale-90 origin-top-left"}>
                        <PlayerStatus p={uiPlayers[1]} isLeft={true} compactMode={getMode(uiPlayers.length)} language={language} />
                    </div>
                 )}
            </div>
            
            <div className="flex flex-col items-center mx-auto">
                  <div className="flex items-center gap-3">
                      {/* Settings Button moved to the left */}
                      <button 
                        onClick={onSettingsClick}
                        className="p-2 bg-black/50 hover:bg-black/80 rounded-xl border border-white/15 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95 pointer-events-auto"
                        title={TEXT_DICTIONARY[language].options}
                      >
                        <Settings size={18} />
                      </button>

                      <div className="bg-black/50 px-6 py-1.5 rounded-2xl border border-white/15 flex items-center gap-4">
                          <div className={`text-3xl font-black font-mono leading-none ${totalSeconds > 300 ? "text-red-500 animate-pulse" : "text-white"}`}>{timeStr}</div>
                          <div className="h-6 w-px bg-white/20"></div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                              <MapIcon size={14} className="text-blue-500"/>
                              <span className="truncate max-w-[140px]">{language === 'zh' ? activeMap?.nameZh : activeMap?.name}</span>
                          </div>
                      </div>
                  </div>
            </div>

            {/* Right Enemies Group - 同步显示敌方状态 */}
            <div className="absolute top-2.5 right-10 flex gap-4 flex-row-reverse">
                 {gameMode === GameMode.PVP ? (
                    uiEnemies[0] ? <PlayerStatus p={uiEnemies[0]} isLeft={false} compactMode="none" language={language} /> : <div className="w-[450px]" />
                 ) : (
                    <div className="flex flex-row-reverse gap-4">
                        {uiEnemies.map(enemy => (
                            <PlayerStatus key={enemy.id} p={enemy} isLeft={false} compactMode={getMode(uiEnemies.length)} language={language} />
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
};
