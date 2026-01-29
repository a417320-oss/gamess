
import React, { useState, useEffect } from 'react';
import { GameStatus, TankConfig, MapConfig, GameMode, Difficulty, ThemeId, GameStats, MatchRecord, KeyBindings } from '../types';
import { RefreshCw, Keyboard, Play, Trophy, Map as MapIcon, Dices, Music2, VolumeX, Globe, BookOpen, X, Zap, Activity, Settings, Home, Repeat, Palette, Flame, Crosshair, Target, Shield, ChevronsRight, CornerUpLeft, Maximize, Layers, Bomb, Cpu, Bot, Skull, Eye, GripVertical, Activity as ActivityIcon, Swords, User, Users, PenTool, Plus, Trash2, HelpCircle, Gamepad2, Snowflake, Minimize, Monitor, Heart, BarChart3, Clock, Calendar, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react';
import { TEXT_DICTIONARY, POWERUP_INFO, PLAYER_COLORS, GAME_VERSION, TANK_CLASSES, RESOLUTIONS, THEMES, MAPS } from '../constants';
import { TankIcon } from './TankIcons';

const STATS_STORAGE_KEY = 'tank_battle_stats_v1';

interface ControlsProps {
  gameStatus: GameStatus;
  winner: number | null;
  tanks: TankConfig[];
  maps: MapConfig[];
  p1TankId: string;
  setP1TankId: (id: string) => void;
  p2TankId: string;
  setP2TankId: (id: string) => void;
  mapId: string;
  setMapId: (id: string) => void;
  onStartGame: () => void;
  onGoToSelect: (mode: GameMode) => void;
  isMusicOn: boolean;
  toggleMusic: () => void;
  language: 'en' | 'zh';
  toggleLanguage: () => void;
  isPaused: boolean;
  togglePause: () => void;
  onRestart: () => void;
  onQuit: () => void;
  p1Name: string;
  setP1Name: (name: string) => void;
  p2Name: string;
  setP2Name: (name: string) => void;
  p1Color: string;
  setP1Color: (color: string) => void;
  p2Color: string;
  setP2Color: (color: string) => void;
  targetResolution: { w: number, h: number };
  setTargetResolution: (res: { w: number, h: number }) => void;
  gameScale: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  pvePlayerCount: 1 | 2;
  setPvePlayerCount: (c: 1 | 2) => void;
  p1ControlScheme: 'directional' | 'tank';
  toggleP1ControlScheme: () => void;
  p2ControlScheme: 'directional' | 'tank';
  toggleP2ControlScheme: () => void;
  theme: ThemeId;
  toggleTheme: () => void;
  keyBindings: KeyBindings;
  setKeyBindings: (bindings: KeyBindings) => void;
}

const TankStatsPanel = ({ tankId, t, language }: { tankId: string, t: any, language: string }) => {
    const isRandom = tankId === 'random';
    const tank = TANK_CLASSES.find(tk => tk.id === tankId);

    const StatItem = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
        <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight">{label}</span>
            <span className={`text-sm font-black ${color} leading-none`}>{value}</span>
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-black/30 p-2 rounded-lg border border-white/5 backdrop-blur-sm min-w-[160px]">
            <StatItem label={t.hp} value={isRandom ? '???' : tank?.maxHp || 0} color="text-green-400" />
            <StatItem label={t.speed} value={isRandom ? '???' : tank?.speed || 0} color="text-blue-400" />
            <StatItem label={t.damage} value={isRandom ? '???' : tank?.bulletDamage || 0} color="text-red-400" />
            <StatItem label={t.fireRate} value={isRandom ? '???' : (60 / (tank?.shootCooldown || 1)).toFixed(1) + '/s'} color="text-yellow-400" />
            <StatItem label={t.reload} value={isRandom ? '???' : ((tank?.reloadTime || 0) / 60).toFixed(1) + 's'} color="text-orange-400" />
            <StatItem label={t.bulletSize} value={isRandom ? '???' : tank?.bulletSize || 0} color="text-cyan-400" />
            <StatItem label={t.clip} value={isRandom ? '???' : tank?.maxAmmo || 0} color="text-indigo-400" />
            <StatItem label={t.bulletSpeed} value={isRandom ? '???' : tank?.bulletSpeed || 0} color="text-pink-400" />
        </div>
    );
};

export const StatisticsModal = ({ show, onClose, t, language, theme }: any) => {
    const [stats, setStats] = useState<GameStats | null>(null);
    const [tab, setTab] = useState<'pvp' | 'pve'>('pvp');

    useEffect(() => {
        if (show) {
            const stored = localStorage.getItem(STATS_STORAGE_KEY);
            if (stored) setStats(JSON.parse(stored));
        }
    }, [show]);

    if (!show) return null;
    const themeStyles = THEMES[theme];

    const formatTime = (ms: number) => {
        if (!ms) return '--:--';
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
            <div className={`bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden`}>
                <div className="flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-3xl font-black text-blue-500 tracking-wider flex items-center gap-3"> <BarChart3 size={32} /> {language === 'zh' ? '战绩统计' : 'Statistics'} </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"> <X size={24} /> </button>
                </div>

                <div className="flex border-b border-slate-700 bg-slate-950/50">
                     {[ { id: 'pvp', label: language === 'zh' ? '玩家对战' : 'PvP Records', icon: Swords }, { id: 'pve', label: language === 'zh' ? '人机挑战' : 'PvE Clears', icon: Bot } ].map(btnTab => (
                         <button key={btnTab.id} onClick={() => setTab(btnTab.id as any)} className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-lg transition-all border-b-2 ${tab === btnTab.id ? 'border-blue-500 text-blue-500 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}> <btnTab.icon size={20} /> {btnTab.label} </button>
                     ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                    {tab === 'pvp' && (
                        <div className="space-y-3">
                            {stats?.matchHistory.filter(m => m.mode === GameMode.PVP).map(m => (
                                <div key={m.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <Calendar size={18} className="text-slate-500" />
                                        <div className="text-xs text-slate-400">{new Date(m.date).toLocaleDateString()}</div>
                                        <div className="font-black text-white text-lg">
                                            <span className={m.winner === 0 ? "text-blue-400" : "text-slate-400"}>{m.p1Name}</span>
                                            <span className="mx-2 text-slate-600">VS</span>
                                            <span className={m.winner === 1 ? "text-red-400" : "text-slate-400"}>{m.p2Name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{language === 'zh' ? '耗时' : 'TIME'}</span>
                                            <span className="font-mono text-white">{formatTime(m.time)}</span>
                                        </div>
                                        <div className={`px-4 py-1 rounded-full font-black uppercase text-sm ${m.winner === 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                                            {m.winner === 0 ? m.p1Name : m.p2Name} {language === 'zh' ? '胜' : 'WIN'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stats?.matchHistory.filter(m => m.mode === GameMode.PVP).length === 0 && (
                                <div className="text-center py-20 text-slate-500 font-bold">{language === 'zh' ? '暂无对战记录' : 'No PvP records yet.'}</div>
                            )}
                        </div>
                    )}

                    {tab === 'pve' && (
                        <div className="flex flex-col gap-8">
                            <div className="grid grid-cols-3 gap-6">
                                {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(diff => {
                                    const soloCount = stats?.pveSoloClearsByDiff?.[diff] || 0;
                                    const duoCount = stats?.pveDuoClearsByDiff?.[diff] || 0;
                                    const bestSolo = stats?.pveGlobalBestSolo?.[diff] || 0;
                                    const bestDuo = stats?.pveGlobalBestDuo?.[diff] || 0;
                                    const diffLabel = t[diff.toLowerCase()];
                                    return (
                                        <div key={diff} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700 flex flex-col gap-5">
                                            <div className={`text-center font-black uppercase tracking-widest text-base ${diff === Difficulty.HARD ? 'text-red-400' : diff === Difficulty.MEDIUM ? 'text-yellow-400' : 'text-green-400'}`}>{diffLabel}</div>
                                            <div className="flex justify-around items-center border-b border-slate-700/50 pb-4">
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 text-blue-400 mb-1"><User size={14}/> <span className="text-[10px] font-bold uppercase">{t.solo}</span></div>
                                                    <div className="text-3xl font-black text-white">{soloCount}</div>
                                                </div>
                                                <div className="w-px h-10 bg-slate-700"></div>
                                                <div className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1"><Users size={14}/> <span className="text-[10px] font-bold uppercase">{t.duo}</span></div>
                                                    <div className="text-3xl font-black text-white">{duoCount}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-[10px] text-slate-500 font-black uppercase text-center tracking-tighter">{t.fastest}</div>
                                                <div className="flex justify-between items-center text-sm font-mono px-2">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase">{t.solo}</span>
                                                    <span className="text-yellow-400">{formatTime(bestSolo)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-mono px-2">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase">{t.duo}</span>
                                                    <span className="text-cyan-400">{formatTime(bestDuo)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-black text-white mt-4 border-l-4 border-blue-500 pl-4 uppercase">{language === 'zh' ? '近期挑战' : 'Recent Challenges'}</h3>
                                {stats?.matchHistory.filter(m => m.mode === GameMode.PVE).slice(0, 10).map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${m.difficulty === Difficulty.HARD ? 'bg-red-500 text-white' : m.difficulty === Difficulty.MEDIUM ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>{m.difficulty}</div>
                                            <div className="flex flex-col">
                                                <div className="font-black text-white">{m.p1Name} {m.p2Name ? `& ${m.p2Name}` : ''}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">{MAPS.find(mp => mp.id === m.mapId)?.nameZh || m.mapId}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-500 font-bold">{new Date(m.date).toLocaleDateString()}</div>
                                                <div className="font-mono text-white">{formatTime(m.time)}</div>
                                            </div>
                                            <div className={`px-4 py-1 rounded-full font-black uppercase text-sm ${m.winner === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                                                {m.winner === 0 ? (language === 'zh' ? '通关' : 'CLEAR') : (language === 'zh' ? '失败' : 'FAIL')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {stats?.matchHistory.filter(m => m.mode === GameMode.PVE).length === 0 && (
                                    <div className="text-center py-20 text-slate-500 font-bold">{language === 'zh' ? '暂无PVE记录' : 'No PvE records yet.'}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MenuBackground = ({ theme }: { theme: ThemeId }) => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className={`absolute inset-0 bg-gradient-to-br ${THEMES[theme].bgGradient}`} />
            {theme === 'default' && (
                <>
                    <div className="absolute inset-0 perspective-[1000px]">
                        <div className="absolute inset-[-100%] w-[300%] h-[300%] origin-center rotate-x-[60deg] animate-grid-scroll opacity-20"
                            style={{ backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[20%] w-full animate-scan" />
                    <div className="absolute inset-0">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="absolute bg-blue-400/30 rounded-full animate-float-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 4 + 2}px`, height: `${Math.random() * 4 + 2}px`, animationDuration: `${Math.random() * 10 + 10}s`, animationDelay: `${Math.random() * 5}s` }} />
                        ))}
                    </div>
                </>
            )}
            {theme === 'christmas' && (
                <>
                    <div className="absolute inset-0">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="absolute bg-white rounded-full animate-snow-fall" style={{ left: `${Math.random() * 100}%`, top: `-10px`, width: `${Math.random() * 3 + 2}px`, height: `${Math.random() * 3 + 2}px`, opacity: Math.random() * 0.7 + 0.3, animationDuration: `${Math.random() * 5 + 5}s`, animationDelay: `${Math.random() * 5}s` }} />
                        ))}
                    </div>
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-600/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-green-600/10 to-transparent" />
                </>
            )}
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,${theme === 'default' ? '#020617' : '#2a0a0a'}_90%)]`} />
            <style>{`
                @keyframes grid-scroll { 0% { transform: rotateX(60deg) translateY(0); } 100% { transform: rotateX(60deg) translateY(60px); } }
                @keyframes scan { 0% { top: -20%; } 100% { top: 120%; } }
                @keyframes float-particle { 0% { transform: translateY(0) translateX(0); opacity: 0; } 20% { opacity: 0.5; } 80% { opacity: 0.5; } 100% { transform: translateY(-100px) translateX(20px); opacity: 0; } }
                @keyframes snow-fall { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) translateX(${Math.random() * 50 - 25}px); opacity: 0; } }
                .animate-grid-scroll { animation: grid-scroll 2s linear infinite; }
                .animate-scan { animation: scan 8s linear infinite; }
                .animate-float-particle { animation: float-particle linear infinite; }
                .animate-snow-fall { animation: snow-fall linear infinite; }
            `}</style>
        </div>
    );
};

export const ScaledView = ({ children, width, height, scale, className = "", transparent = false, theme }: any) => {
    const bgClass = transparent ? "" : `${THEMES[theme].panelBg} backdrop-blur-md`;
    return (
        <div className={`fixed inset-0 flex items-center justify-center z-50 overflow-hidden ${bgClass} ${transparent ? 'pointer-events-none' : 'pointer-events-auto'}`}>
             <div style={{ width: width, height: height, transform: `scale(${scale})` }} className={`relative shrink-0 flex flex-col items-center justify-center ${className}`}>
                 {children}
             </div>
        </div>
    );
};

export const ActionButtons = ({ gameStatus, togglePause, setShowManual, setShowSettings, setShowStats, t, position = "top" }: any) => {
    const isGame = position === "game";
    const baseClass = `${isGame ? 'p-2' : 'p-2.5'} rounded-full bg-slate-800/90 text-white hover:bg-slate-700 transition-colors border border-slate-600 flex items-center justify-center shadow-lg pointer-events-auto`;
    
    const settingsBtn = (
        <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); if (gameStatus === GameStatus.PLAYING) togglePause(); else setShowSettings(true); }} className={`${baseClass} hover:bg-blue-600`} title={t.options}>
            <Settings size={isGame ? 18 : 20} className="text-white" />
        </button>
    );

    const manualBtn = !isGame && (
        <button type="button" tabIndex={-1} onClick={() => setShowManual(true)} className={baseClass} title={t.manual}>
            <BookOpen size={20} className="text-yellow-200" />
        </button>
    );

    const statsBtn = !isGame && (
        <button type="button" tabIndex={-1} onClick={() => setShowStats(true)} className={baseClass} title={t.stats}>
            <BarChart3 size={20} className="text-blue-300" />
        </button>
    );

    if (position === "header") return (
        <div className="flex gap-2 items-center mr-8">
            {settingsBtn}
            {manualBtn}
            {statsBtn}
        </div>
    );
    if (position === "game") return null; 
    return <div className={`absolute z-[100] top-6 right-6 flex gap-2`}>{settingsBtn}{manualBtn}{statsBtn}</div>;
};

const KeybindingPanel = ({ keyBindings, setKeyBindings, theme, t, onClose }: { keyBindings: KeyBindings, setKeyBindings: (kb: KeyBindings) => void, theme: ThemeId, t: any, onClose: () => void }) => {
    const [listeningFor, setListeningFor] = useState<{ player: 'p1' | 'p2', action: keyof KeyBindings['p1'] } | null>(null);
    const themeStyles = THEMES[theme];

    useEffect(() => {
        if (listeningFor) {
            const handler = (e: KeyboardEvent) => {
                e.preventDefault();
                setKeyBindings({
                    ...keyBindings,
                    [listeningFor.player]: {
                        ...keyBindings[listeningFor.player],
                        [listeningFor.action]: e.key
                    }
                });
                setListeningFor(null);
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }
    }, [listeningFor, keyBindings, setKeyBindings]);

    const formatKey = (key: string) => {
        if (key === ' ') return 'SPACE';
        if (key.startsWith('Arrow')) return key.replace('Arrow', '').toUpperCase();
        return key.toUpperCase();
    };

    const ControlRow = ({ player, action, label, icon: Icon }: { player: 'p1' | 'p2', action: keyof KeyBindings['p1'], label: string, icon: any }) => {
        const isListening = listeningFor?.player === player && listeningFor?.action === action;
        const currentKey = keyBindings[player][action];
        return (
            <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <Icon size={16} /> {label}
                </div>
                <button
                    onClick={() => setListeningFor({ player, action })}
                    className={`px-4 py-1 rounded font-mono font-black text-sm transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                    {isListening ? t.pressKey || 'Press Key...' : formatKey(currentKey)}
                </button>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-[170] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
            <div className={`${themeStyles.panelBg} border-2 ${themeStyles.panelBorder} p-6 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-4`}>
                <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <h2 className={`text-2xl font-black ${themeStyles.textMain} tracking-wider flex items-center gap-2`}>
                        <Keyboard size={28} /> {t.bindingTitle || 'Controls'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Player 1 Column */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-blue-400 font-black text-lg uppercase mb-2 flex items-center gap-2"><User size={20}/> {t.p1}</h3>
                        <ControlRow player="p1" action="up" label="Up / Forward" icon={ArrowUp} />
                        <ControlRow player="p1" action="down" label="Down / Back" icon={ArrowDown} />
                        <ControlRow player="p1" action="left" label="Left / Rotate L" icon={ArrowLeft} />
                        <ControlRow player="p1" action="right" label="Right / Rotate R" icon={ArrowRight} />
                        <div className="h-px bg-slate-700 my-1"/>
                        <ControlRow player="p1" action="fire" label="Fire" icon={Target} />
                        <ControlRow player="p1" action="reload" label="Reload" icon={RefreshCw} />
                    </div>

                    {/* Player 2 Column */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-red-400 font-black text-lg uppercase mb-2 flex items-center gap-2"><User size={20}/> {t.p2}</h3>
                        <ControlRow player="p2" action="up" label="Up / Forward" icon={ArrowUp} />
                        <ControlRow player="p2" action="down" label="Down / Back" icon={ArrowDown} />
                        <ControlRow player="p2" action="left" label="Left / Rotate L" icon={ArrowLeft} />
                        <ControlRow player="p2" action="right" label="Right / Rotate R" icon={ArrowRight} />
                        <div className="h-px bg-slate-700 my-1"/>
                        <ControlRow player="p2" action="fire" label="Fire" icon={Target} />
                        <ControlRow player="p2" action="reload" label="Reload" icon={RefreshCw} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SettingsModal = ({ show, onClose, t, onQuit, gameStatus, isMusicOn, toggleMusic, language, toggleLanguage, p1ControlScheme, toggleP1ControlScheme, p2ControlScheme, toggleP2ControlScheme, theme, toggleTheme, keyBindings, setKeyBindings }: any) => {
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [showKeybindings, setShowKeybindings] = useState(false);

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);
    const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch((e) => console.log(e)); else if (document.exitFullscreen) document.exitFullscreen(); };
    if (!show) return null;
    
    if (showKeybindings) {
        return <KeybindingPanel keyBindings={keyBindings} setKeyBindings={setKeyBindings} theme={theme} t={t} onClose={() => setShowKeybindings(false)} />;
    }

    const themeStyles = THEMES[theme];
    return (
        <div className="absolute inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
            <div className={`${themeStyles.panelBg} border-2 ${themeStyles.panelBorder} p-6 rounded-2xl shadow-2xl max-w-[340px] w-full flex flex-col gap-4 text-center`}>
                <div className={`flex justify-between items-center border-b ${themeStyles.panelBorder} pb-3`}>
                    <h2 className={`text-xl font-black ${themeStyles.textMain} tracking-wider flex items-center gap-2`}> <Settings size={24} className={themeStyles.textAccent} /> {t.settings} </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white"><X size={18} /></button>
                </div>
                <div className="space-y-2.5">
                    <button onClick={toggleFullscreen} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${isFullscreen ? themeStyles.primaryBtn : themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2">{isFullscreen ? <Minimize size={18} /> : <Monitor size={18} />} {isFullscreen ? t.windowed : t.fullscreen}</span> <div className={`w-2.5 h-2.5 rounded-full ${isFullscreen ? 'bg-white' : 'bg-slate-500'}`} /> </button>
                    <button onClick={toggleMusic} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${isMusicOn ? themeStyles.primaryBtn : themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2">{isMusicOn ? <Music2 size={18} /> : <VolumeX size={18} />} {t.music}</span> <div className={`w-8 h-4 rounded-full relative transition-colors ${isMusicOn ? 'bg-white/30' : 'bg-slate-600'}`}> <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isMusicOn ? 'left-4.5' : 'left-0.5'}`} /> </div> </button>
                    <button onClick={() => setShowKeybindings(true)} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2"><Keyboard size={18} /> {t.customizeControls || 'Controls'}</span> <ChevronsRight size={16} /> </button>
                    <button onClick={toggleTheme} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2"><Palette size={18} /> {t.theme}</span> <div className={`text-[10px] font-black ${themeStyles.textAccent}`}> {theme === 'default' ? t.themeDefault : t.themeChristmas} </div> </button>
                    <button onClick={toggleP1ControlScheme} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2"><Gamepad2 size={18} /> P1 {t.controlScheme}</span> <div className={`text-[10px] font-black ${themeStyles.textAccent}`}> {p1ControlScheme === 'directional' ? t.schemeDirectional : t.schemeTank} </div> </button>
                    <button onClick={toggleP2ControlScheme} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2"><Gamepad2 size={18} /> P2 {t.controlScheme}</span> <div className={`text-[10px] font-black ${themeStyles.textAccent}`}> {p2ControlScheme === 'directional' ? t.schemeDirectional : t.schemeTank} </div> </button>
                    <button onClick={toggleLanguage} className={`flex items-center justify-between px-4 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn}`}> <span className="flex items-center gap-2"><Globe size={18} /> {t.languageSelector}</span> <div className="flex items-center gap-2 text-[10px] font-black"> <span className="opacity-50">/</span> <span className={language === 'en' ? 'text-white' : 'opacity-50'}>EN</span> </div> </button>
                    {gameStatus !== GameStatus.MENU && ( <button onClick={() => { onClose(); onQuit(); }} className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${themeStyles.secondaryBtn} hover:bg-red-900/50 hover:text-red-200 hover:border-red-500/50`}> <Home size={18} /> {t.mainMenu} </button> )}
                </div>
                <div className={`mt-1 pt-3 border-t ${themeStyles.panelBorder}`}> <button onClick={onClose} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm">{t.close}</button> </div>
            </div>
        </div>
    );
};

export const PauseMenu = ({ isPaused, gameStatus, togglePause, onRestart, onQuit, setShowSettings, setShowStats, t, theme, language }: any) => {
    if (!isPaused || gameStatus !== GameStatus.PLAYING) return null;
    const themeStyles = THEMES[theme];
    return (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
            <div className={`${themeStyles.panelBg} border-2 ${themeStyles.panelBorder} p-8 rounded-2xl shadow-2xl max-w-[320px] w-full flex flex-col gap-4 text-center`}>
                <div className="flex justify-center mb-1"><Settings size={40} className={`${themeStyles.textAccent} animate-spin-slow`} /></div>
                <h2 className={`text-2xl font-black ${themeStyles.textMain} tracking-wider mb-2`}>{t.paused}</h2>
                <button onClick={togglePause} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition-all hover:scale-105 shadow-lg text-base ${themeStyles.primaryBtn}`}><Play size={18} fill="currentColor" /> {t.resume}</button>
                <button onClick={() => setShowSettings(true)} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition-all hover:scale-105 border text-base ${themeStyles.secondaryBtn}`}><Settings size={18} /> {t.options}</button>
                <button onClick={() => setShowStats(true)} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition-all hover:scale-105 border text-base ${themeStyles.secondaryBtn}`}><BarChart3 size={18} /> {language === 'zh' ? '战绩统计' : 'Statistics'}</button>
                <button onClick={onRestart} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition-all hover:scale-105 border text-base ${themeStyles.secondaryBtn}`}><RefreshCw size={18} /> {t.restart}</button>
                <button onClick={onQuit} className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-800 hover:bg-red-900/50 text-red-200 border border-slate-700 hover:border-red-500/50 rounded-xl font-bold transition-all hover:scale-105 mt-2 text-base"><Home size={18} /> {t.mainMenu}</button>
            </div>
        </div>
    );
};

export const ManualModal = ({ showManual, setShowManual, manualTab, setManualTab, tanks, language, t }: any) => {
    if (!showManual) return null;
    return (
        <div className="absolute inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
            <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-3xl font-black text-yellow-500 tracking-wider flex items-center gap-3"> <BookOpen size={32} /> {t.manual} </h2>
                    <button onClick={() => setShowManual(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"> <X size={24} /> </button>
                </div>
                <div className="flex border-b border-slate-700 bg-slate-950/50">
                     {[ { id: 'controls', label: language === 'zh' ? '操作' : 'Controls', icon: Keyboard }, { id: 'stats', label: t.stats, icon: Activity }, { id: 'bot_stats', label: t.ai_stats, icon: Skull }, { id: 'items', label: t.items, icon: Zap }, ].map(tab => (
                         <button key={tab.id} onClick={() => setManualTab(tab.id)} className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-lg transition-all border-b-2 ${manualTab === tab.id ? 'border-yellow-500 text-yellow-500 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}> <tab.icon size={20} /> {tab.label} </button>
                     ))}
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50">
                    {manualTab === 'controls' && (
                        <div className="flex gap-12 justify-center items-start h-full">
                            <div className="flex-1 max-w-md bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50">
                                <h3 className="text-2xl font-black text-blue-400 mb-8 flex items-center gap-2"><User size={28}/> {t.p1}</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.moveLabel}</span> <div className="flex gap-2"> {['W','A','S','D'].map(k => <kbd key={k} className="w-12 h-12 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">{k}</kbd>)} </div> </div>
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.fireLabel}</span> <kbd className="h-12 px-6 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">SPACE</kbd> </div>
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.reloadAction}</span> <kbd className="h-12 px-6 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">R</kbd> </div>
                                </div>
                            </div>
                            <div className="h-full w-px bg-slate-700/50" />
                            <div className="flex-1 max-w-md bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50">
                                <h3 className="text-2xl font-black text-red-400 mb-8 flex items-center gap-2"><User size={28}/> {t.p2}</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.moveLabel}</span> <div className="flex gap-2"> {['↑','←','↓','→'].map(k => <kbd key={k} className="w-12 h-12 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">{k}</kbd>)} </div> </div>
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.fireLabel}</span> <kbd className="h-12 px-6 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">ENTER</kbd> </div>
                                    <div className="flex items-center justify-between"> <span className="font-bold text-slate-400 text-lg">{t.reloadAction}</span> <kbd className="h-12 px-6 flex items-center justify-center bg-slate-700 rounded-lg font-black text-xl shadow-[0_4px_0_#1e293b] border-t border-slate-600">+</kbd> </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {manualTab === 'stats' && (
                        <div className="grid grid-cols-2 gap-4">
                            {tanks.filter((tk: TankConfig) => !tk.isBotOnly).map((tank: TankConfig) => {
                                return (
                                    <div key={tank.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex gap-5 hover:bg-slate-800 transition-colors">
                                        <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 shrink-0 shadow-inner"> <TankIcon tankId={tank.id} color="#3b82f6" size={48} /> </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="text-lg font-black text-white">{language === 'zh' ? tank.nameZh : tank.name}</h4>
                                                    <p className="text-xs text-slate-400">{language === 'zh' ? tank.descriptionZh : tank.description}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                                                <div className="flex justify-between"><span className="text-slate-500">{t.hp}</span> <span className="text-green-400 font-bold">{tank.maxHp}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.speed}</span> <span className="text-blue-400 font-bold">{tank.speed}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.damage}</span> <span className="text-red-400 font-bold">{tank.bulletDamage}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.fireRate}</span> <span className="text-yellow-400 font-bold">{((60/tank.shootCooldown)).toFixed(1)}/s</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.reload}</span> <span className="text-orange-400 font-bold">{(tank.reloadTime / 60).toFixed(1)}s</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.bulletSize}</span> <span className="text-cyan-400 font-bold">{tank.bulletSize}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.clip}</span> <span className="text-indigo-400 font-bold">{tank.maxAmmo}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.bulletSpeed}</span> <span className="text-pink-400 font-bold">{tank.bulletSpeed}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {manualTab === 'bot_stats' && (
                        <div className="grid grid-cols-2 gap-4">
                            {tanks.filter((tk: TankConfig) => tk.isBotOnly).map((tank: TankConfig) => {
                                return (
                                    <div key={tank.id} className="bg-red-950/30 p-5 rounded-xl border border-red-900/50 flex gap-5 hover:bg-red-900/40 transition-colors">
                                        <div className="w-16 h-16 bg-red-900/50 rounded-xl flex items-center justify-center text-red-200 shrink-0 shadow-inner border border-red-800"> <TankIcon tankId={tank.id} color="#ef4444" size={48} /> </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="text-lg font-black text-red-100">{language === 'zh' ? tank.nameZh : tank.name}</h4>
                                                    <p className="text-xs text-red-300/70">{language === 'zh' ? tank.descriptionZh : tank.description}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                                                <div className="flex justify-between"><span className="text-slate-500">{t.hp}</span> <span className="text-green-400 font-bold">{tank.maxHp}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.speed}</span> <span className="text-blue-400 font-bold">{tank.speed}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.damage}</span> <span className="text-red-400 font-bold">{tank.bulletDamage}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.fireRate}</span> <span className="text-yellow-400 font-bold">{((60/tank.shootCooldown)).toFixed(1)}/s</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.reload}</span> <span className="text-orange-400 font-bold">{(tank.reloadTime / 60).toFixed(1)}s</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.bulletSize}</span> <span className="text-cyan-400 font-bold">{tank.bulletSize}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.clip}</span> <span className="text-indigo-400 font-bold">{tank.maxAmmo}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-500">{t.bulletSpeed}</span> <span className="text-pink-400 font-bold">{tank.bulletSpeed}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {manualTab === 'items' && (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(POWERUP_INFO).map(([key, info]: [string, any]) => {
                                const Icon = info.icon;
                                return (
                                    <div key={key} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex gap-5 items-center">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2`} style={{ borderColor: info.hex, backgroundColor: info.hex + '20' }}> <Icon size={28} style={{ color: info.hex }} /> </div>
                                        <div>
                                            <h4 className="text-lg font-black mb-1" style={{ color: info.hex }}>{language === 'zh' ? info.labelZh : info.labelEn}</h4>
                                            <p className="text-sm text-slate-400 leading-snug">{language === 'zh' ? info.descZh : info.descEn}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MapPreview = ({ map }: { map: MapConfig }) => {
  if (!map) return <div className="w-full h-full bg-slate-900" />;
  return (
    <div className="w-full h-full bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute inset-2">
          <div className="relative w-full h-full">
            {map.walls.map((w, i) => ( <div key={i} className="absolute bg-slate-600 border border-slate-500 shadow-sm" style={{ left: `${(w.x / 1280) * 100}%`, top: `${(w.y / 720) * 100}%`, width: `${(w.width / 1280) * 100}%`, height: `${(w.height / 720) * 100}%`, }} /> ))}
            <div className="absolute w-3 h-3 bg-blue-500 rounded-full border border-white shadow-[0_0_8px_#3b82f6] z-10" style={{ left: `${(map.p1Start.x / 1280) * 100}%`, top: `${(map.p1Start.y / 720) * 100}%`, transform: 'translate(-50%, -50%)' }} />
            <div className="absolute w-3 h-3 bg-red-500 rounded-full border border-white shadow-[0_0_8px_#ef4444] z-10" style={{ left: `${(map.p1Start.x / 1280) * 100}%`, top: `${(map.p1Start.y / 720) * 100}%`, transform: 'translate(-50%, -50%)' }} />
          </div>
      </div>
    </div>
  );
};

export const Controls = (props: ControlsProps) => {
  const { gameStatus, winner, tanks, maps, p1TankId, setP1TankId, p2TankId, setP2TankId, mapId, setMapId, onStartGame, isMusicOn, toggleMusic, language, toggleLanguage, isPaused, togglePause, onRestart, onQuit, onGoToSelect, gameMode, difficulty, setDifficulty, pvePlayerCount, setPvePlayerCount, p1Name, setP1Name, p2Name, setP2Name, p1Color, setP1Color, p2Color, setP2Color, targetResolution, setTargetResolution, gameScale, p1ControlScheme, toggleP1ControlScheme, p2ControlScheme, toggleP2ControlScheme, theme, toggleTheme, keyBindings, setKeyBindings } = props;
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [manualTab, setManualTab] = useState('controls');
  const t = TEXT_DICTIONARY[language];
  const p1Tank = tanks.find(t => t.id === p1TankId) || tanks[0];
  const p2Tank = tanks.find(t => t.id === p2TankId) || tanks[0];
  const selectedMap = maps.find(m => m.id === mapId) || maps[0];
  const themeStyles = THEMES[theme];
  const selectRandomMap = () => { const randomMap = maps[Math.floor(Math.random() * maps.length)]; setMapId(randomMap.id); };
  const isP2Active = gameMode === GameMode.PVP || (gameMode === GameMode.PVE && pvePlayerCount === 2);
  
  const panelOverlayClass = "absolute inset-0 bg-white/5 transition-colors pointer-events-none";

  return (
    <>
      <ScaledView width={targetResolution.w} height={targetResolution.h} scale={gameScale} className="pointer-events-none" transparent={gameStatus === GameStatus.PLAYING} theme={theme}>
          {gameStatus === GameStatus.GAME_OVER && <ActionButtons gameStatus={gameStatus} togglePause={togglePause} setShowManual={setShowManual} setShowSettings={setShowSettings} setShowStats={setShowStats} t={t} />}
          {gameStatus === GameStatus.MENU && (
            <div className="w-full h-full relative flex flex-col items-center justify-center gap-12 animate-in zoom-in duration-500 pointer-events-auto overflow-hidden">
              <MenuBackground theme={theme} />
              <div className="text-center relative z-10">
                <div className={`absolute inset-0 ${theme === 'christmas' ? 'bg-red-500/20' : 'bg-blue-500/20'} blur-[100px] rounded-full animate-pulse`} />
                <h1 className={`text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-br ${theme === 'christmas' ? 'from-white via-yellow-100 to-red-400' : 'from-white via-blue-100 to-slate-400'} tracking-tighter drop-shadow-2xl transform -skew-x-12 relative z-10 pr-6 pl-2`} style={{ textShadow: theme === 'christmas' ? '0 0 40px rgba(220,38,38,0.5)' : '0 0 40px rgba(59,130,246,0.5)' }}> {t.title} </h1>
                <div className={`text-4xl font-black ${theme === 'christmas' ? 'text-green-400' : 'text-blue-500'} tracking-[1em] uppercase mt-2 ml-4 animate-pulse relative z-10`}>{t.subtitle}</div>
                <div className="absolute -right-8 -top-8 rotate-12 bg-yellow-400 text-black font-bold px-3 py-1 rounded shadow-lg text-sm">v{GAME_VERSION}</div>
                <div className={`absolute -right-12 -top-16 rotate-6 ${themeStyles.textDim} font-bold text-xs uppercase tracking-widest flex items-center gap-1`}><PenTool size={10} /> Author: halili</div>
              </div>
              <div className="flex flex-col gap-4 w-80 relative z-10">
                <button onClick={() => { onGoToSelect(GameMode.PVP); setPvePlayerCount(1); }} className="group relative w-full h-20 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-all duration-300"> <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" /> <div className="absolute inset-0 flex items-center justify-center gap-4 text-3xl font-black italic text-white group-hover:tracking-widest transition-all"> <Swords size={32} /> {t.pvpMode} </div> </button>
                <button onClick={() => { onGoToSelect(GameMode.PVE); setPvePlayerCount(1); }} className="group relative w-full h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 transition-all duration-300"> <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" /> <div className="absolute inset-0 flex items-center justify-center gap-4 text-3xl font-black italic text-white group-hover:tracking-widest transition-all"> <Bot size={32} /> {t.pveMode} </div> </button>
                <div className="flex gap-4 mt-2"> 
                    <button onClick={() => setShowManual(true)} className={`flex-1 py-4 ${themeStyles.secondaryBtn} rounded-xl font-bold transition-all border flex items-center justify-center gap-2`}> <BookOpen size={20} /> {t.manual} </button> 
                    <button onClick={() => setShowStats(true)} className={`flex-1 py-4 ${themeStyles.secondaryBtn} rounded-xl font-bold transition-all border flex items-center justify-center gap-2`}> <BarChart3 size={20} /> {language === 'zh' ? '统计' : 'Stats'} </button> 
                    <button onClick={() => setShowSettings(true)} className={`flex-1 py-4 ${themeStyles.secondaryBtn} rounded-xl font-bold transition-all border flex items-center justify-center gap-2`}> <Settings size={20} /> {t.options} </button> 
                </div>
              </div>
            </div>
          )}
          {gameStatus === GameStatus.CHARACTER_SELECT && (
            <div className="w-full h-full flex flex-col pointer-events-auto">
              <div className={`h-20 shrink-0 flex items-center justify-between px-8 ${themeStyles.panelBg} border-b ${themeStyles.panelBorder} backdrop-blur-sm z-30`}>
                 <div className="flex items-center gap-4"> <button onClick={onQuit} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><Home size={24} /></button> <h2 className={`text-2xl font-black ${themeStyles.textMain} italic uppercase flex items-center gap-2`}> {gameMode === GameMode.PVP ? <Swords className="text-blue-500"/> : <Bot className="text-red-500"/>} {t.config} </h2> </div>
                 <ActionButtons gameStatus={gameStatus} togglePause={togglePause} setShowManual={setShowManual} setShowSettings={setShowSettings} setShowStats={setShowStats} t={t} position="header" />
              </div>
              <div className="flex-1 flex overflow-hidden">
                  <div className={`flex-1 ${themeStyles.panelBg} border-r ${themeStyles.panelBorder} flex flex-col p-4 gap-3 relative group`}>
                      <div className={`${panelOverlayClass} group-hover:bg-white/10`} />
                      <div className="flex items-center gap-4 relative z-10"> <User size={32} className="text-blue-500" /> <input type="text" value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder={t.default_p1} className={`bg-transparent text-3xl font-black ${themeStyles.textMain} placeholder-slate-600 focus:outline-none uppercase w-full`} maxLength={10} /> </div>
                          <div className="flex items-center gap-4 relative z-10">
                                <div className="flex flex-wrap gap-2 max-w-[200px]"> {PLAYER_COLORS.map(c => {
                                  const isTakenByP2 = c === p2Color;
                                  return ( 
                                    <button 
                                        key={c} 
                                        disabled={isTakenByP2} 
                                        onClick={() => setP1Color(c)} 
                                        className={`w-8 h-8 rounded-full shadow-lg transition-all hover:scale-110 relative flex items-center justify-center ${p1Color === c ? 'ring-2 ring-white scale-110' : 'opacity-50'} ${isTakenByP2 ? 'cursor-not-allowed grayscale opacity-30' : ''}`} 
                                        style={{ backgroundColor: c }}
                                    >
                                        {isTakenByP2 && <X size={20} className="text-white drop-shadow-md" />}
                                    </button> 
                                  );
                                })} </div>
                                <TankStatsPanel tankId={p1TankId} t={t} language={language} />
                          </div>
                          <div className="flex-1 flex items-center justify-center relative">
                               <div className={`w-56 h-56 rounded-full border-4 border-dashed ${theme === 'default' ? 'border-slate-700' : 'border-yellow-500/50'} flex items-center justify-center relative animate-spin-slow-reverse`}></div>
                               <div className="absolute inset-0 flex items-center justify-center"> {p1TankId === 'random' ? ( <div className="flex flex-col items-center"> <Dices size={100} className="text-slate-400 mb-2" /> </div> ) : ( <TankIcon tankId={p1TankId} color={p1Color} size={160} style={{ filter: `drop-shadow(0 0 30px ${p1Color})` }} /> )} </div>
                               <div className="absolute bottom-6 text-center"> <div className={`text-3xl font-black ${themeStyles.textMain} uppercase mb-1`}>{p1TankId === 'random' ? t.randomTank : (language === 'zh' ? p1Tank.nameZh : p1Tank.name)}</div> <div className="text-blue-400 font-bold">{p1TankId === 'random' ? t.random : (language === 'zh' ? p1Tank.descriptionZh : p1Tank.description)}</div> </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 relative z-10">
                              <button onClick={() => setP1TankId('random')} className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${p1TankId === 'random' ? 'bg-blue-500/20 border-blue-500 text-white' : `${themeStyles.secondaryBtn}`}`}> <span className="text-xs font-black uppercase">{t.random}</span> </button>
                              {tanks.filter(tk => !tk.isBotOnly).map(tk => ( <button key={tk.id} onClick={() => setP1TankId(tk.id)} className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${p1TankId === tk.id ? 'bg-blue-500/20 border-blue-500 text-white' : `${themeStyles.secondaryBtn}`}`}> <span className="text-xs font-black uppercase">{language === 'zh' ? tk.nameZh : tk.name}</span> </button> ))}
                          </div>
                  </div>

                  <div className={`w-[320px] ${themeStyles.panelBg} border-x ${themeStyles.panelBorder} flex flex-col p-4 gap-3 relative z-20 shadow-2xl backdrop-blur-md justify-center`}>
                      <div className={`flex items-center justify-between ${theme === 'default' ? 'bg-slate-900 border-slate-800' : 'bg-red-950/50 border-yellow-500/30'} rounded-lg p-2 border`}>
                         <button onClick={() => { const idx = maps.findIndex(m => m.id === mapId); setMapId(maps[(idx - 1 + maps.length) % maps.length].id); }} className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white"><ChevronsRight size={20} className="rotate-180"/></button>
                         <div className="text-center flex-1 flex flex-col items-center"> <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2"> {t.map} <button onClick={selectRandomMap} className="p-0.5 hover:text-white text-slate-500 transition-colors" title={t.randomMap}> <Dices size={12} /> </button> </div> <div className={`font-bold truncate max-w-[150px] ${themeStyles.textMain}`}>{language === 'zh' ? selectedMap.nameZh : selectedMap.name}</div> </div>
                         <button onClick={() => { const idx = maps.findIndex(m => m.id === mapId); setMapId(maps[(idx + 1) % maps.length].id); }} className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white"><ChevronsRight size={20}/></button>
                      </div>
                      <div className={`w-[220px] h-[220px] mx-auto aspect-video bg-slate-900 rounded-xl border-2 ${themeStyles.panelBorder} overflow-hidden relative shadow-lg group`}> <MapPreview map={selectedMap} /> </div>
                      {gameMode === GameMode.PVE && (
                          <>
                            <div className="flex flex-col gap-2 w-full"> <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">{t.difficulty}</div> <div className="flex gap-2"> {Object.values(Difficulty).map(d => { const isSelected = difficulty === d; let colorClass = `border ${themeStyles.panelBorder} ${themeStyles.textDim} hover:bg-white/5`; if (isSelected) { if (d === Difficulty.EASY) colorClass = 'bg-green-600 border-green-500 text-white'; else if (d === Difficulty.MEDIUM) colorClass = 'bg-yellow-600 border-yellow-500 text-white'; else colorClass = 'bg-red-600 border-red-500 text-white'; } return ( <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${colorClass}`}> {t[d.toLowerCase()]} </button> ) })} </div> </div>
                            <div className={`${theme === 'default' ? 'bg-slate-800/50' : 'bg-red-900/40'} p-3 rounded-lg border ${themeStyles.panelBorder} text-center`}> <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t.ai_intel}</div> <div className={`text-xs font-medium ${themeStyles.textAccent}`}> {difficulty === Difficulty.EASY && t.enemy_easy} {difficulty === Difficulty.MEDIUM && t.enemy_medium} {difficulty === Difficulty.HARD && t.enemy_hard} </div> </div>
                          </>
                      )}
                      <button onClick={onStartGame} className={`w-full h-16 ${theme === 'default' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white border-2 border-yellow-400'} font-black text-3xl uppercase tracking-tighter rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105 transition-all z-20 flex items-center justify-center gap-2`}> <Play size={24} fill="currentColor" /> {t.fight} </button>
                  </div>

                  <div className={`flex-1 ${themeStyles.panelBg} border-l ${themeStyles.panelBorder} flex flex-col p-4 gap-3 relative group`}>
                      <div className={`${panelOverlayClass} ${isP2Active ? 'group-hover:bg-white/10' : 'bg-slate-500/5'}`} />
                      {isP2Active ? (
                        <>
                            {gameMode === GameMode.PVE && ( <button onClick={() => setPvePlayerCount(1)} className="absolute top-4 left-4 z-20 p-2 bg-slate-800/80 hover:bg-red-900/80 text-slate-400 hover:text-red-200 rounded-full border border-slate-700 transition-colors" title="Remove Player 2"> <Trash2 size={20} /> </button> )}
                            <div className="flex items-center gap-4 justify-end relative z-10"> <input type="text" value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder={t.default_p2} className={`bg-transparent text-3xl font-black ${themeStyles.textMain} placeholder-slate-600 focus:outline-none uppercase w-full text-right`} maxLength={10} /> <User size={32} className="text-red-500" /> </div>
                            <div className="flex items-center gap-4 justify-end relative z-10">
                                <TankStatsPanel tankId={p2TankId} t={t} language={language} />
                                <div className="flex flex-wrap gap-2 justify-end max-w-[200px]"> {PLAYER_COLORS.slice().map(c => {
                                  const isTakenByP1 = c === p1Color;
                                  return ( 
                                    <button 
                                        key={c} 
                                        disabled={isTakenByP1} 
                                        onClick={() => setP2Color(c)} 
                                        className={`w-8 h-8 rounded-full shadow-lg transition-all hover:scale-110 relative flex items-center justify-center ${p2Color === c ? 'ring-2 ring-white scale-110' : 'opacity-50'} ${isTakenByP1 ? 'cursor-not-allowed grayscale opacity-30' : ''}`} 
                                        style={{ backgroundColor: c }}
                                    >
                                        {isTakenByP1 && <X size={20} className="text-white drop-shadow-md" />}
                                    </button> 
                                  );
                                })} </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center relative">
                                <div className={`w-56 h-56 rounded-full border-4 border-dashed ${theme === 'default' ? 'border-slate-700' : 'border-yellow-500/50'} flex items-center justify-center relative animate-spin-slow`}></div>
                                <div className="absolute inset-0 flex items-center justify-center"> {p2TankId === 'random' ? ( <div className="flex flex-col items-center"> <Dices size={100} className="text-slate-400 mb-2" /> </div> ) : ( <TankIcon tankId={p2TankId} color={p2Color} size={160} style={{ filter: `drop-shadow(0 0 30px ${p2Color})` }} /> )} </div>
                                <div className="absolute bottom-6 text-center"> <div className={`text-3xl font-black ${themeStyles.textMain} uppercase mb-1`}>{p2TankId === 'random' ? t.randomTank : (language === 'zh' ? p2Tank.nameZh : p2Tank.name)}</div> <div className="text-red-400 font-bold">{p2TankId === 'random' ? t.random : (language === 'zh' ? p2Tank.descriptionZh : p2Tank.description)}</div> </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 relative z-10">
                                <button onClick={() => setP2TankId('random')} className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${p2TankId === 'random' ? 'bg-red-500/20 border-red-500 text-white' : `${themeStyles.secondaryBtn}`}`}> <span className="text-xs font-black uppercase">{t.random}</span> </button>
                                {tanks.filter(tk => !tk.isBotOnly).map(tk => ( <button key={tk.id} onClick={() => setP2TankId(tk.id)} className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${p2TankId === tk.id ? 'bg-red-500/20 border-red-500 text-white' : `${themeStyles.secondaryBtn}`}`}> <span className="text-xs font-black uppercase">{language === 'zh' ? tk.nameZh : tk.name}</span> </button> ))}
                            </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                             <button onClick={() => setPvePlayerCount(2)} className={`group flex flex-col items-center gap-6 p-10 rounded-3xl border-4 border-dashed border-slate-700 hover:border-blue-500 ${theme === 'default' ? 'hover:bg-slate-800/50' : 'hover:bg-red-900/30'} transition-all cursor-pointer w-full max-sm`}>
                                 <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-lg"> <Plus size={48} className="text-slate-500 group-hover:text-white" /> </div>
                                 <div> <h3 className={`text-2xl font-black ${themeStyles.textDim} group-hover:text-white uppercase mb-2`}>{t.twoPlayers}</h3> <p className="text-slate-500 text-sm">{language === 'zh' ? "点击添加玩家 2 加入战斗" : "Click to add Player 2 for Co-op"}</p> </div>
                             </button>
                        </div>
                      )}
                  </div>
              </div>
            </div>
          )}
          {gameStatus === GameStatus.GAME_OVER && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in zoom-in duration-500 pointer-events-auto">
              <ActionButtons gameStatus={gameStatus} togglePause={togglePause} setShowManual={setShowManual} setShowSettings={setShowSettings} setShowStats={setShowStats} t={t} />
              <div className="flex flex-col items-center gap-8 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] animate-pulse" />
                  <Trophy size={80} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce" />
                  <div className="text-center z-10 px-8">
                      <h2 className="text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg tracking-tighter uppercase py-2 px-4 pr-8"> {winner === 0 ? t.win : t.missionFailed} </h2>
                      <p className="text-2xl font-bold text-white mt-4 tracking-widest uppercase"> {winner === 0 ? (gameMode === GameMode.PVE ? t.mission_complete : (p1Name || t.player_1) + " " + t.win) : (gameMode === GameMode.PVE ? t.boss_dominated : (p2Name || t.player_2) + " " + t.win)} </p>
                  </div>
                  <div className="flex gap-6 z-10 mt-4"> <button onClick={onRestart} className="px-10 py-5 bg-white text-black rounded-xl font-black text-2xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center gap-3"> <RefreshCw size={28} /> {t.newMatch} </button> <button onClick={onQuit} className="px-10 py-5 bg-slate-800 text-white border-2 border-slate-600 rounded-xl font-black text-2xl hover:scale-105 transition-transform hover:bg-slate-700 flex items-center gap-3"> <Home size={28} /> {t.mainMenu} </button> </div>
              </div>
            </div>
          )}
      </ScaledView>
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} t={t} onQuit={onQuit} gameStatus={gameStatus} isMusicOn={isMusicOn} toggleMusic={toggleMusic} language={language} toggleLanguage={toggleLanguage} p1ControlScheme={p1ControlScheme} toggleP1ControlScheme={toggleP1ControlScheme} p2ControlScheme={p2ControlScheme} toggleP2ControlScheme={toggleP2ControlScheme} theme={theme} toggleTheme={toggleTheme} keyBindings={keyBindings} setKeyBindings={setKeyBindings} />
      <ManualModal showManual={showManual} setShowManual={setShowManual} manualTab={manualTab} setManualTab={setManualTab} tanks={tanks} language={language} t={t} />
      <StatisticsModal show={showStats} onClose={() => setShowStats(false)} t={t} language={language} theme={theme} />
      <PauseMenu isPaused={isPaused} gameStatus={gameStatus} togglePause={togglePause} onRestart={onRestart} onQuit={onQuit} setShowSettings={setShowSettings} setShowStats={setShowStats} t={t} theme={theme} language={language} />
    </>
  );
};
