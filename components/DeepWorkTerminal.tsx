'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import quotesData from '../data/quotes.json';

// --- Types ---
type TimerState = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

interface Settings {
    workTime: number; // in minutes
    shortBreakTime: number;
    longBreakTime: number;
    cyclesBeforeLongBreak: number;
}

interface Stats {
    xp: number;
    level: number;
    pomodorosCompleted: number;
    totalWorkTime: number; // in seconds
}

interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'FOCUS' | 'SYSTEM' | 'ACHIEVEMENT';
}

// --- Constants ---
const LEVEL_THRESHOLDS = {
    GUEST: 0,
    SUDO: 5,
    ROOT: 15,
};

const DEFAULT_SETTINGS: Settings = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    cyclesBeforeLongBreak: 4,
};

const SOUNDS = {
    ALARM: '/sounds/alarm_retro.mp3', // Placeholder
    AMBIENCE_DATACENTER: '/sounds/ambience_datacenter.mp3',
    AMBIENCE_RAIN: '/sounds/ambience_rain.mp3',
    AMBIENCE_KEYBOARD: '/sounds/ambience_keyboard.mp3',
};

// --- Helper Functions ---
const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getProgressBar = (current: number, total: number, width: number = 20): string => {
    const percentage = Math.max(0, Math.min(1, current / total));
    const filledChars = Math.round(percentage * width);
    const emptyChars = width - filledChars;
    return `[${'#'.repeat(filledChars)}${'-'.repeat(emptyChars)}] ${Math.round(percentage * 100)}%`;
};

const getLevelTitle = (pomodoros: number): string => {
    if (pomodoros >= LEVEL_THRESHOLDS.ROOT) return 'ROOT ACCESS';
    if (pomodoros >= LEVEL_THRESHOLDS.SUDO) return 'SUDO USER';
    return 'GUEST USER';
};

const getQuote = (): string => {
    const randomIndex = Math.floor(Math.random() * quotesData.length);
    return quotesData[randomIndex];
};

export default function DeepWorkTerminal() {
    // --- State ---
    const [timerState, setTimerState] = useState<TimerState>('WORK');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workTime * 60);
    const [isActive, setIsActive] = useState(false);
    const [cyclesCompleted, setCyclesCompleted] = useState(0);

    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [stats, setStats] = useState<Stats>({ xp: 0, level: 1, pomodorosCompleted: 0, totalWorkTime: 0 });

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [taskInput, setTaskInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [quote, setQuote] = useState('');

    const [volume, setVolume] = useState(0.5);
    const [ambience, setAmbience] = useState<string>('NONE');
    const ambienceRef = useRef<HTMLAudioElement | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // --- New State for Features ---
    const [username, setUsername] = useState<string | null>(null);
    const [tasks, setTasks] = useState<{ id: number; text: string; completed: boolean }[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);

    // Refs for safe access in intervals/effects
    const timerStateRef = useRef(timerState);
    const settingsRef = useRef(settings);
    const statsRef = useRef(stats);
    const cyclesCompletedRef = useRef(cyclesCompleted);
    const volumeRef = useRef(volume);
    const usernameRef = useRef(username);

    // --- Sync Refs ---
    useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { statsRef.current = stats; }, [stats]);
    useEffect(() => { cyclesCompletedRef.current = cyclesCompleted; }, [cyclesCompleted]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);

    // --- Handlers ---

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
        setLogs((prev) => [...prev, { id: Date.now().toString(), timestamp, message, type }].slice(-50));
    }, []);

    const playAlarm = useCallback(() => {
        const audio = new Audio(SOUNDS.ALARM);
        audio.volume = volumeRef.current;

        // Try playing file, if fails or file missing, use fallback beep
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.log('Audio file play failed, using fallback beep:', error);

                // Fallback: Web Audio API Beep
                try {
                    // Avoid circular reference by not shadowing the global AudioContext
                    const AudioContextContent = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                    if (AudioContextContent) {
                        const ctx = new AudioContextContent();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();

                        osc.connect(gain);
                        gain.connect(ctx.destination);

                        osc.type = 'square';
                        osc.frequency.setValueAtTime(440, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

                        gain.gain.setValueAtTime(volumeRef.current * 0.5, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                        osc.start();
                        osc.stop(ctx.currentTime + 0.5);
                    }
                } catch (e) {
                    console.error('Fallback audio failed', e);
                }
            });
        }
    }, []);

    const handleTimerComplete = useCallback(() => {
        setIsActive(false);
        playAlarm();

        // Always try to send notification
        if (Notification.permission === 'granted') {
            new Notification('Sudo Pomodoro', {
                body: 'Timer Complete! Time for next sequence.',
                icon: '/favicon.ico'
            });
        } else if (Notification.permission === 'default') {
            // Request permission and send notification if granted
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification('Sudo Pomodoro', {
                        body: 'Timer Complete! Time for next sequence.',
                        icon: '/favicon.ico'
                    });
                }
            });
        }

        const currentSettings = settingsRef.current;
        const currentStats = statsRef.current;
        const currentCycles = cyclesCompletedRef.current;
        const currentState = timerStateRef.current;

        if (currentState === 'WORK') {
            const newPomodoros = currentStats.pomodorosCompleted + 1;
            const xpGained = 100;
            let newLevel = 1;
            if (newPomodoros >= LEVEL_THRESHOLDS.ROOT) newLevel = 3;
            else if (newPomodoros >= LEVEL_THRESHOLDS.SUDO) newLevel = 2;

            setStats((prev) => ({
                ...prev,
                pomodorosCompleted: newPomodoros,
                xp: prev.xp + xpGained,
                level: newLevel
            }));

            addLog('ACHIEVEMENT', `Work cycle complete. +${xpGained}XP.`);
            if (newLevel > currentStats.level) {
                addLog('ACHIEVEMENT', `ACCESS LEVEL INCREASED: ${getLevelTitle(newPomodoros)}`);
            }

            const nextCycles = currentCycles + 1;
            if (nextCycles >= currentSettings.cyclesBeforeLongBreak) {
                setTimerState('LONG_BREAK');
                setTimeLeft(currentSettings.longBreakTime * 60);
                setCyclesCompleted(0);
                addLog('SYSTEM', 'Initiating Long Break sequence.');
            } else {
                setTimerState('SHORT_BREAK');
                setTimeLeft(currentSettings.shortBreakTime * 60);
                setCyclesCompleted(nextCycles);
                addLog('SYSTEM', 'Initiating Short Break sequence.');
            }
            setQuote(getQuote());
        } else {
            setTimerState('WORK');
            setTimeLeft(currentSettings.workTime * 60);
            addLog('SYSTEM', 'Break sequence complete. Ready for next cycle.');
        }
    }, [addLog, playAlarm]);

    // Ref for handler to be called from interval
    const handleTimerCompleteRef = useRef(handleTimerComplete);
    useEffect(() => { handleTimerCompleteRef.current = handleTimerComplete; }, [handleTimerComplete]);

    const toggleTimer = () => {
        if (!isActive && timeLeft === 0) return;
        setIsActive(!isActive);
        addLog('SYSTEM', isActive ? 'Timer PAUSED.' : 'Timer STARTED.');
    };

    const resetTimer = () => {
        setIsActive(false);
        if (timerState === 'WORK') setTimeLeft(settings.workTime * 60);
        else if (timerState === 'SHORT_BREAK') setTimeLeft(settings.shortBreakTime * 60);
        else if (timerState === 'LONG_BREAK') setTimeLeft(settings.longBreakTime * 60);
        addLog('SYSTEM', 'Timer RESET.');
    };

    // NEW: Apply Settings Handler
    const applySettings = () => {
        setShowSettings(false);

        // If the timer is NOT active, immediately reflect the change for the current state
        // This solves the user's issue of "I changed the time but it didn't apply"
        if (!isActive) {
            if (timerState === 'WORK') setTimeLeft(settings.workTime * 60);
            else if (timerState === 'SHORT_BREAK') setTimeLeft(settings.shortBreakTime * 60);
            else if (timerState === 'LONG_BREAK') setTimeLeft(settings.longBreakTime * 60);
            addLog('SYSTEM', 'Configuration applied. Timer adjusted.');
        } else {
            addLog('SYSTEM', 'Configuration saved. Changes apply on next cycle or reset.');
        }
    };

    // Improved number input handler to allow clearing the field
    const handleNumberChange = (field: keyof Settings, value: string) => {
        const intVal = parseInt(value);
        if (value === '' || isNaN(intVal)) {
            setSettings({ ...settings, [field]: 0 });
        } else {
            setSettings({ ...settings, [field]: intVal });
        }
    };

    // --- Effects ---

    // Load from LocalStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('dwt_settings');
        const savedStats = localStorage.getItem('dwt_stats');
        const savedUsername = localStorage.getItem('dwt_username');
        const savedTasks = localStorage.getItem('dwt_tasks');

        if (savedSettings) setSettings(JSON.parse(savedSettings));
        if (savedStats) setStats(JSON.parse(savedStats));
        if (savedUsername) setUsername(savedUsername);
        if (savedTasks) setTasks(JSON.parse(savedTasks));

        addLog('SYSTEM', 'Terminal initialized.');
        if (savedUsername) {
            addLog('SYSTEM', `Welcome back, ${savedUsername}.`);
        } else {
            addLog('SYSTEM', 'USER NOT IDENTIFIED. PLEASE ENTER YOUR NAME.');
        }

        // Request Notification Permission on Mount
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    addLog('SYSTEM', 'Notification access GRANTED.');
                } else {
                    addLog('SYSTEM', 'Notification access DENIED.');
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save to LocalStorage
    useEffect(() => { localStorage.setItem('dwt_settings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem('dwt_stats', JSON.stringify(stats)); }, [stats]);
    useEffect(() => { if (username) localStorage.setItem('dwt_username', username); }, [username]);
    useEffect(() => { localStorage.setItem('dwt_tasks', JSON.stringify(tasks)); }, [tasks]);

    // Timer Interval
    useEffect(() => {
        if (!isActive) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    // Call the completion handler via Ref to avoid dependency cycles
                    if (handleTimerCompleteRef.current) handleTimerCompleteRef.current();
                    return 0;
                }

                // Track work time
                if (timerStateRef.current === 'WORK') {
                    setStats(prevStats => ({ ...prevStats, totalWorkTime: prevStats.totalWorkTime + 1 }));
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive]);

    // Audio Management
    useEffect(() => {
        if (ambienceRef.current) {
            ambienceRef.current.pause();
            ambienceRef.current = null;
        }

        if (isActive && timerState === 'WORK' && ambience !== 'NONE') {
            let src = '';
            if (ambience === 'DATACENTER') src = SOUNDS.AMBIENCE_DATACENTER;
            if (ambience === 'RAIN') src = SOUNDS.AMBIENCE_RAIN;
            if (ambience === 'KEYBOARD') src = SOUNDS.AMBIENCE_KEYBOARD;

            if (src) {
                const audio = new Audio(src);
                audio.loop = true;
                audio.volume = volume;
                audio.play().catch(e => console.log('Audio play failed', e));
                ambienceRef.current = audio;
            }
        }

        return () => {
            if (ambienceRef.current) {
                ambienceRef.current.pause();
            }
        };
    }, [isActive, timerState, ambience, volume]);


    // --- Handlers for User & Tasks ---

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const input = taskInput.trim();
        if (!input) return;

        // Onboarding: One-time name entry
        if (!username) {
            setUsername(input);
            addLog('SYSTEM', `Identity confirmed: ${input}`);
            setTaskInput('');
            return;
        }

        // Name Editing Mode
        if (isEditingName) {
            setUsername(input);
            setIsEditingName(false);
            addLog('SYSTEM', `Identity updated: ${input}`);
            setTaskInput('');
            return;
        }

        // Command Parsing
        if (input.startsWith('/')) {
            const [cmd, ...args] = input.slice(1).split(' ');
            const argStr = args.join(' ');

            switch (cmd.toLowerCase()) {
                case 'help':
                    setShowHelp(true);
                    addLog('SYSTEM', 'Help module loaded.');
                    break;
                case 'user':
                case 'name':
                    if (argStr) {
                        setUsername(argStr);
                        addLog('SYSTEM', `Identity updated: ${argStr}`);
                    } else {
                        setIsEditingName(true);
                        addLog('SYSTEM', 'Enter new username:');
                    }
                    break;
                case 'add':
                    if (argStr) {
                        const newTask = { id: Date.now(), text: argStr, completed: false };
                        setTasks(prev => [...prev, newTask]);
                        addLog('SYSTEM', `Task added: "${argStr}"`);
                    } else {
                        addLog('SYSTEM', 'Usage: /add <task description>');
                    }
                    break;
                case 'clear':
                    setLogs([]);
                    // User requested to clear *everything*, so we do NOT add a new log here.
                    break;
                case 'start':
                case 'execute':
                    if (!isActive) {
                        toggleTimer();
                        // toggleTimer handles the log
                    } else {
                        addLog('SYSTEM', 'Timer is already running.');
                    }
                    break;
                case 'pause':
                    if (isActive) {
                        toggleTimer();
                        // toggleTimer handles the log
                    } else {
                        addLog('SYSTEM', 'Timer is already paused.');
                    }
                    break;
                case 'stop':
                case 'abort':
                    resetTimer();
                    // resetTimer handles the log
                    break;
                default:
                    addLog('SYSTEM', `Unknown command: ${cmd}. Type /help for instructions.`);
            }
        } else {
            // Default behavior: Add as task directly as per user request
            const newTask = { id: Date.now(), text: input, completed: false };
            setTasks(prev => [...prev, newTask]);
            addLog('FOCUS', `Objective Added: ${input}`);
        }
        setTaskInput('');
    };

    const toggleTask = (id: number) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: number) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const skipPhase = () => {
        setIsActive(false);
        handleTimerComplete();
    };


    // --- Render Helpers ---

    const getStatusColor = () => {
        if (timerState === 'WORK') return 'text-[#00ff41]';
        if (timerState === 'SHORT_BREAK') return 'text-cyan-400';
        if (timerState === 'LONG_BREAK') return 'text-purple-500';
        return 'text-white';
    };

    const getTotalDuration = () => {
        if (timerState === 'WORK') return settings.workTime * 60;
        if (timerState === 'SHORT_BREAK') return settings.shortBreakTime * 60;
        return settings.longBreakTime * 60;
    };

    // Get current active task (last uncompleted)
    const activeTask = tasks.filter(t => !t.completed).slice(-1)[0];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#00ff41] p-4 font-mono flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#00ff41] selection:text-black">
            {/* Scanline Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-[0.03] mix-blend-overlay"></div>
            <div className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-transparent via-[rgba(0,255,65,0.03)] to-transparent bg-[length:100%_4px]"></div>

            {/* Main Terminal Box */}
            <div className="w-full max-w-5xl border-2 border-[#00ff41] p-6 shadow-[0_0_20px_rgba(0,255,65,0.3)] bg-[#0c0c0c] relative z-10 flex flex-col lg:flex-row gap-6">

                {/* Left Column: Timer & Controls (Main) */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-[#00ff41] pb-4 select-none">
                        <div className="flex flex-col">
                            <span className="text-xs opacity-70">SYSTEM_ID: SANTI_ROOT_TERM_V2</span>
                            <span className="text-xl font-bold tracking-wider">{username ? username.toUpperCase() : 'UNIDENTIFIED'}</span>
                            <span className="text-xs">LEVEL: {getLevelTitle(stats.pomodorosCompleted)} | XP: {stats.xp}</span>
                        </div>
                        <div className="flex flex-col items-end text-xs opacity-70">
                            <span>UPTIME: {formatTime(stats.totalWorkTime)}</span>
                            <span>AMB: {ambience}</span>
                        </div>
                    </div>

                    {/* Main Display Area */}
                    <div className="flex flex-col items-center justify-center py-6 gap-4">
                        {timerState !== 'WORK' && (
                            <div className="text-center max-w-lg italic opacity-80 mb-4 animate-pulse">
                                &quot;{quote}&quot;
                            </div>
                        )}

                        {/* Active Objective Display */}
                        {activeTask && timerState === 'WORK' && (
                            <div className="flex items-center gap-2 border border-cyan-400 text-cyan-400 px-4 py-1 rounded bg-cyan-400/10 mb-2">
                                <span className="animate-pulse">▶</span>
                                <span className="font-bold tracking-wide">CURRENT_OBJECTIVE: {activeTask.text}</span>
                            </div>
                        )}

                        <div className={`text-8xl md:text-9xl font-bold tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(0,255,65,0.8)] ${getStatusColor()}`}>
                            {formatTime(timeLeft)}
                        </div>

                        <div className="text-xl tracking-widest animate-pulse">
                            [{timerState.replace('_', ' ')}] STATUS
                        </div>

                        <div className="font-mono text-lg opacity-80">
                            {getProgressBar(getTotalDuration() - timeLeft, getTotalDuration(), 30)}
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            <button onClick={toggleTimer} className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-colors uppercase tracking-widest font-bold">
                                [ {isActive ? 'PAUSE' : 'EXECUTE'} ]
                            </button>
                            <button onClick={resetTimer} className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-colors uppercase tracking-widest font-bold">
                                [ ABORT ]
                            </button>
                            <button onClick={skipPhase} className="border border-red-500 text-red-500 px-6 py-2 hover:bg-red-500 hover:text-black transition-colors uppercase tracking-widest font-bold opacity-50 hover:opacity-100">
                                [ SKIP ]
                            </button>
                            <button onClick={() => setShowSettings(!showSettings)} className="border border-cyan-400 text-cyan-400 px-6 py-2 hover:bg-cyan-400 hover:text-black transition-colors uppercase tracking-widest font-bold">
                                [ CONFIG ]
                            </button>
                            <button onClick={() => setShowHelp(true)} className="border border-yellow-400 text-yellow-400 px-6 py-2 hover:bg-yellow-400 hover:text-black transition-colors uppercase tracking-widest font-bold">
                                [ HELP ]
                            </button>
                        </div>
                    </div>

                    {/* System Logs / Task Input */}
                    <div className="border border-[#00ff41] p-4 h-64 overflow-y-auto bg-black font-mono text-sm shadow-inner scrollbar-hide flex flex-col">
                        <div className="flex flex-col flex-1">
                            {logs.map((log) => (
                                <div key={log.id} className="mb-1">
                                    <span className="opacity-50">[{log.timestamp}]</span>{' '}
                                    <span className={log.type === 'ACHIEVEMENT' ? 'text-yellow-400' : log.type === 'FOCUS' ? 'text-cyan-400' : 'text-[#00ff41]'} >{log.type}_LOG:</span>{' '}
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleTaskSubmit} className="mt-2 flex gap-2 shrink-0">
                            <span className="text-[#00ff41] whitespace-nowrap">{username ? `${username}@term:~$` : 'unknown@term:~$'}</span>
                            <input
                                type="text"
                                value={taskInput}
                                onChange={(e) => setTaskInput(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full caret-[#00ff41] font-bold"
                                placeholder={!username ? "IDENTIFY YOURSELF..." : isEditingName ? "ENTER NEW NAME..." : "Enter objective or command..."}
                                autoFocus
                            />
                        </form>
                    </div>
                </div>

                {/* Right Column: Task List (Sidebar) */}
                <div className="w-full lg:w-80 border-l lg:border-l border-[#00ff41] pl-0 lg:pl-6 flex flex-col">
                    <div className="text-[#00ff41] font-bold border-b border-[#00ff41] pb-2 mb-4">
                        [ OBJECTIVE_MODULE ]
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] scrollbar-hide relative">
                        {tasks.length === 0 && (
                            <div className="text-xs opacity-50 italic text-center mt-10">
                                NO OBJECTIVES DETECTED.<br />
                                TYPE TASK IN TERMINAL TO ADD.
                            </div>
                        )}
                        {tasks.map((task) => (
                            <div key={task.id} className="group flex items-start gap-2 text-sm hover:bg-[#00ff41]/5 p-1 cursor-pointer" onClick={() => toggleTask(task.id)}>
                                <span className={task.completed ? 'text-[#00ff41]' : 'text-gray-500'}>
                                    [{task.completed ? 'x' : ' '}]
                                </span>
                                <span className={`flex-1 ${task.completed ? 'line-through opacity-50' : 'opacity-90'}`}>
                                    {task.text}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 font-bold px-1"
                                    title="Delete Task"
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Mini Stats in Sidebar */}
                    <div className="mt-4 pt-4 border-t border-[#00ff41] text-xs opacity-70 space-y-1">
                        <div className="flex justify-between">
                            <span>TOTAL_WORK:</span>
                            <span>{Math.floor(stats.totalWorkTime / 3600)}h {Math.floor((stats.totalWorkTime % 3600) / 60)}m</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SESSION_CYCLES:</span>
                            <span>{cyclesCompleted} / {settings.cyclesBeforeLongBreak}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
                    <div className="border border-[#00ff41] bg-[#0c0c0c] p-8 w-full max-w-md shadow-[0_0_30px_rgba(0,255,65,0.2)]">
                        <h2 className="text-2xl font-bold mb-6 text-[#00ff41] border-b border-[#00ff41] pb-2">SYSTEM CONFIGURATION</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs opacity-70 mb-1">WORK_CYCLE (MIN)</label>
                                    <input
                                        type="number"
                                        value={settings.workTime}
                                        onChange={(e) => handleNumberChange('workTime', e.target.value)}
                                        className="w-full bg-black border border-[#00ff41] p-2 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs opacity-70 mb-1">SHORT_BREAK (MIN)</label>
                                    <input
                                        type="number"
                                        value={settings.shortBreakTime}
                                        onChange={(e) => handleNumberChange('shortBreakTime', e.target.value)}
                                        className="w-full bg-black border border-[#00ff41] p-2 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs opacity-70 mb-1">LONG_BREAK (MIN)</label>
                                    <input
                                        type="number"
                                        value={settings.longBreakTime}
                                        onChange={(e) => handleNumberChange('longBreakTime', e.target.value)}
                                        className="w-full bg-black border border-[#00ff41] p-2 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs opacity-70 mb-1">CYCLES_FOR_LONG</label>
                                    <input
                                        type="number"
                                        value={settings.cyclesBeforeLongBreak}
                                        onChange={(e) => handleNumberChange('cyclesBeforeLongBreak', e.target.value)}
                                        className="w-full bg-black border border-[#00ff41] p-2 text-right"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs opacity-70 mb-1">AMBIENCE_MODULE</label>
                                <select value={ambience} onChange={(e) => setAmbience(e.target.value)} className="w-full bg-black border border-[#00ff41] p-2">
                                    <option value="NONE">-- SILENT --</option>
                                    <option value="DATACENTER">LOFI_CODING.MP3</option>
                                    <option value="RAIN">NEON_RAIN.WAV</option>
                                    <option value="KEYBOARD">MECH_KEYBOARD.MP3</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs opacity-70 mb-1">AUDIO_OUTPUT_GAIN: {Math.round(volume * 100)}%</label>
                                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-[#00ff41]" />
                            </div>
                            <div className="border-t border-[#00ff41] pt-4 mt-4">
                                <label className="block text-xs opacity-70 mb-1">USER_IDENTITY</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={username || ''}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-black border border-[#00ff41] p-2"
                                        placeholder="GUEST"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={applySettings} className="bg-[#00ff41] text-black font-bold px-6 py-2 hover:bg-white transition-colors">
                                [ APPLY_CHANGES ]
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelp && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
                    <div className="border border-yellow-400 bg-[#0c0c0c] p-8 w-full max-w-2xl shadow-[0_0_30px_rgba(255,255,0,0.2)]" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6 text-yellow-400 border-b border-yellow-400 pb-2">TERMINAL MANUAL</h2>
                        <div className="space-y-4 text-sm font-mono overflow-y-auto max-h-[60vh]">
                            <div>
                                <strong className="text-yellow-400 block mb-1">:: CORE COMMANDS ::</strong>
                                <ul className="list-disc pl-5 opacity-80 space-y-1">
                                    <li>Type any text and hit ENTER to add a new objective.</li>
                                    <li><span className="text-cyan-400">/help</span> - Open this manual.</li>
                                    <li><span className="text-cyan-400">/add &lt;task&gt;</span> - Explicitly add a task.</li>
                                    <li><span className="text-cyan-400">/name &lt;name&gt;</span> - Update your username.</li>
                                    <li><span className="text-cyan-400">/clear</span> - Clear the system logs.</li>
                                    <li><span className="text-cyan-400">/start</span> - Start timer.</li>
                                    <li><span className="text-cyan-400">/pause</span> - Pause timer.</li>
                                    <li><span className="text-cyan-400">/stop</span> - Abort/Reset timer.</li>
                                </ul>
                            </div>

                            <div>
                                <strong className="text-yellow-400 block mb-1">:: TASK MANAGEMENT ::</strong>
                                <p className="opacity-80 mb-2">Tasks are displayed in the right panel.</p>
                                <ul className="list-disc pl-5 opacity-80 space-y-1">
                                    <li><strong>Click</strong> a task to toggle completion [x].</li>
                                    <li>Hover and click <strong>x</strong> to delete a task.</li>
                                    <li>The last uncompleted task is shown as your <strong>CURRENT_OBJECTIVE</strong>.</li>
                                </ul>
                            </div>

                            <div>
                                <strong className="text-yellow-400 block mb-1">:: PROGRESSION ::</strong>
                                <ul className="list-disc pl-5 opacity-80 space-y-1">
                                    <li>Complete Pomodoros to gain XP and Level Up.</li>
                                    <li><strong>GUEST</strong> &rarr; <strong>SUDO</strong> &rarr; <strong>ROOT</strong> access levels.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={() => setShowHelp(false)} className="bg-yellow-400 text-black font-bold px-6 py-2 hover:bg-white transition-colors">
                                [ CLOSE_MANUAL ]
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
