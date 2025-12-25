import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import { getLabs, Lab } from '../lib/labs.js';
import { getRequiredEnvVars, EnvVar, saveEnvFile, loadExistingEnv } from '../lib/env.js';
import { deployLab, stopLab, getLabStatus, ContainerStatus } from '../lib/docker.js';
import { setupLabLocally } from '../lib/downloader.js';
import EnvForm from './EnvForm.js';
import Header from './Header.js';
import IntroAnimation from './IntroAnimation.js';

// Featured Labs IDs
const FEATURED_IDS = [
    'home-assistant',
    'pihole',
    'portainer',
    'jellyfin',
    'nextcloud',
    'nginx-proxy-manager',
    'vaultwarden'
];

type GroupConfig = {
    id: string;
    label: string;
    description: string;
    color: string;
    icon: string;
    filter: (lab: Lab) => boolean;
};

const GROUPS: GroupConfig[] = [
    {
        id: 'featured',
        label: 'FEATURED',
        description: 'Most popular and essential tools.',
        color: 'yellow',
        icon: '★',
        filter: (l) => FEATURED_IDS.includes(l.id) || FEATURED_IDS.includes(l.name.toLowerCase())
    },
    {
        id: 'vulnerable',
        label: 'VULNERABLE LABS',
        description: 'Security testing environments (Web, API, Red Team).',
        color: 'red',
        icon: '🔓',
        filter: (l) => l.category.startsWith('Vulnerable') || l.category === 'Red-Teaming'
    },
    {
        id: 'monitoring',
        label: 'MONITORING',
        description: 'Tools to observe and track your infrastructure.',
        color: 'cyan',
        icon: '📈',
        filter: (l) => l.category === 'Monitoring'
    },
    {
        id: 'security',
        label: 'SECURITY',
        description: 'Identity managed, password managers, and more.',
        color: 'blue',
        icon: '🛡️',
        filter: (l) => l.category === 'Security'
    },
    {
        id: 'networking',
        label: 'NETWORKING',
        description: 'DNS, Proxies, and connectivity tools.',
        color: 'green',
        icon: '🌐',
        filter: (l) => l.category === 'Networking'
    },
    {
        id: 'automation',
        label: 'AUTOMATION',
        description: 'Workflow automation and smart home.',
        color: 'magenta',
        icon: '🤖',
        filter: (l) => l.category === 'Automation'
    },
    {
        id: 'media',
        label: 'MEDIA',
        description: 'Streaming and media management.',
        color: 'magentaBright',
        icon: '🎬',
        filter: (l) => l.category === 'Media'
    },
    {
        id: 'cloud',
        label: 'CLOUD',
        description: 'File storage and cloud services.',
        color: 'white',
        icon: '☁️',
        filter: (l) => l.category === 'Cloud'
    },
    {
        id: 'dashboard',
        label: 'DASHBOARD',
        description: 'Homelab dashboards and startpages.',
        color: 'redBright',
        icon: '📊',
        filter: (l) => l.category === 'Dashboard'
    },
    {
        id: 'development',
        label: 'DEVELOPMENT',
        description: 'Git, CI/CD, and coding tools.',
        color: 'blueBright',
        icon: '💻',
        filter: (l) => l.category === 'Development'
    },
    {
        id: 'databases',
        label: 'DATABASES',
        description: 'SQL and NoSQL databases.',
        color: 'yellowBright',
        icon: '🗄️',
        filter: (l) => l.category === 'Databases'
    },
    {
        id: 'ai-utils',
        label: 'AI & UTILITIES',
        description: 'AI models and general utilities.',
        color: 'white',
        icon: '🔮',
        filter: (l) => l.category === 'AI_Other'
    }
];

const App = () => {
    const { exit } = useApp();
    const [labs, setLabs] = useState<Lab[]>([]);

    // Intro State
    const [showIntro, setShowIntro] = useState(true);

    // View State
    const [view, setView] = useState<'groups' | 'list' | 'details' | 'downloading' | 'config' | 'deploying' | 'active' | 'manage'>('groups');

    // Group Selection State
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

    // List Selection State
    const [selectedLabIndex, setSelectedLabIndex] = useState(0);
    const [activeGroup, setActiveGroup] = useState<GroupConfig | null>(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Deployment State
    const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [containerStatus, setContainerStatus] = useState<ContainerStatus[]>([]);
    const [downloadStatus, setDownloadStatus] = useState<string>('');

    // App Status State
    const [appStatuses, setAppStatuses] = useState<Record<string, ContainerStatus[]>>({});
    const [focusArea, setFocusArea] = useState<'apps' | 'groups'>('groups');
    const [activeAppIndex, setActiveAppIndex] = useState(0);

    // Grid Pagination State
    const [groupScrollOffset, setGroupScrollOffset] = useState(0);
    const VISIBLE_ROWS = 3;
    const COLUMNS = 2;
    const VISIBLE_ITEMS = VISIBLE_ROWS * COLUMNS;

    useEffect(() => {
        getLabs().then(setLabs);
    }, []);

    // Initial Status Check
    useEffect(() => {
        const checkAllStatuses = async () => {
            const statusMap: Record<string, ContainerStatus[]> = {};
            const installed = labs.filter(l => fs.existsSync(l.path));

            for (const lab of installed) {
                try {
                    const status = await getLabStatus(lab.path);
                    statusMap[lab.id] = status;
                } catch (e) {
                    console.error(`Failed to check status for ${lab.name}`, e);
                }
            }
            setAppStatuses(statusMap);
        };

        if (labs.length > 0) {
            checkAllStatuses();
            const interval = setInterval(checkAllStatuses, 10000);
            return () => clearInterval(interval);
        }
    }, [labs]);

    // Helper: Get installed labs
    const installedLabs = React.useMemo(() => labs.filter(l => fs.existsSync(l.path)), [labs]);

    // Helper: Get labs for current active group
    const currentGroupLabs = React.useMemo(() => {
        if (!activeGroup) return [];
        let filtered = labs.filter(activeGroup.filter);
        if (searchQuery) {
            filtered = filtered.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [activeGroup, labs, searchQuery]);

    useInput((input, key) => {
        if (showIntro || view === 'deploying' || view === 'downloading') return;

        // Global Back Navigation
        if (key.escape) {
            if (view === 'list') {
                setView('groups');
                setSearchQuery('');
            } else if (view === 'groups') {
                exit();
            } else if (view === 'details' || view === 'config') {
                setView('list');
            } else if (view === 'manage') {
                setView('groups');
            } else {
                setView('list');
            }
            return;
        }

        // --- GROUP VIEW NAVIGATION ---
        if (view === 'groups') {
            if (focusArea === 'groups') {
                if (key.upArrow) {
                    if (selectedGroupIndex < COLUMNS) {
                        // If at top row, move to apps if any exist
                        if (installedLabs.length > 0) {
                            setFocusArea('apps');
                            setActiveAppIndex(0);
                        }
                    } else {
                        const newIndex = Math.max(0, selectedGroupIndex - COLUMNS);
                        setSelectedGroupIndex(newIndex);
                        // Check if we need to scroll up
                        if (newIndex < groupScrollOffset * COLUMNS) {
                            setGroupScrollOffset(Math.max(0, groupScrollOffset - 1));
                        }
                    }
                }
                if (key.downArrow) {
                    const newIndex = Math.min(GROUPS.length - 1, selectedGroupIndex + COLUMNS);
                    setSelectedGroupIndex(newIndex);
                    // Check if we need to scroll down
                    const currentRow = Math.floor(newIndex / COLUMNS);
                    const lastVisibleRow = groupScrollOffset + VISIBLE_ROWS - 1;
                    if (currentRow > lastVisibleRow) {
                        setGroupScrollOffset(groupScrollOffset + 1);
                    }
                }
                if (key.leftArrow) setSelectedGroupIndex(prev => Math.max(0, prev - 1));
                if (key.rightArrow) setSelectedGroupIndex(prev => Math.min(GROUPS.length - 1, prev + 1));

                if (key.return) {
                    setActiveGroup(GROUPS[selectedGroupIndex]);
                    setSelectedLabIndex(0);
                    setView('list');
                }
            } else if (focusArea === 'apps') {
                // Navigation within active apps
                if (key.leftArrow) setActiveAppIndex(prev => Math.max(0, prev - 1));
                if (key.rightArrow) setActiveAppIndex(prev => Math.min(installedLabs.length - 1, prev + 1));
                if (key.downArrow) {
                    // Move back to groups
                    setFocusArea('groups');

                    const firstVisible = groupScrollOffset * COLUMNS;
                    // Ensure selection is visible
                    if (selectedGroupIndex < firstVisible || selectedGroupIndex >= firstVisible + VISIBLE_ITEMS) {
                        setSelectedGroupIndex(firstVisible);
                    }
                }

                if (key.return) {
                    const lab = installedLabs[activeAppIndex];
                    if (lab) {
                        setSelectedLab(lab);
                        setView('manage');
                        getLabStatus(lab.path).then(setContainerStatus);
                    }
                }
            }
        }

        // --- LIST VIEW NAVIGATION ---
        if (view === 'list') {
            if (key.upArrow) setSelectedLabIndex(prev => Math.max(0, prev - 1));
            if (key.downArrow) setSelectedLabIndex(prev => Math.min(currentGroupLabs.length - 1, prev + 1));

            if (key.return) {
                if (currentGroupLabs[selectedLabIndex]) {
                    setSelectedLab(currentGroupLabs[selectedLabIndex]);
                    const lab = currentGroupLabs[selectedLabIndex];
                    if (fs.existsSync(lab.path)) {
                        prepareConfig(lab);
                    } else {
                        startDownload(lab);
                    }
                }
            }
        }

        // --- ACTIVITY VIEW ---
        if (view === 'active' || view === 'details' || view === 'manage') {
            const lab = selectedLab;
            if (input === 's' && lab && fs.existsSync(lab.path)) {
                stopLab(lab.path, (log) => setLogs(prev => [...prev.slice(-50), log]))
                    .then(() => {
                        setLogs(prev => [...prev, 'Stopped.']);
                        getLabStatus(lab.path).then(setContainerStatus);
                    })
                    .catch(e => setLogs(prev => [...prev, e.message]));
            }
            if (input === 'r' && lab) {
                prepareConfig(lab);
            }
        }
    });

    const startDownload = async (lab: Lab) => {
        setView('downloading');
        setDownloadStatus(`Initializing download for ${lab.name}...`);
        try {
            setDownloadStatus(`Fetching files from remote repository...`);
            await setupLabLocally(lab.category, lab.id, lab.files);
            setDownloadStatus('Download complete!');
            await new Promise(resolve => setTimeout(resolve, 1000));
            prepareConfig(lab);
        } catch (e: any) {
            setDeployError(`Download failed: ${e.message}`);
            setView('details');
        }
    };

    const prepareConfig = (lab: Lab) => {
        const vars = getRequiredEnvVars(lab);
        const existing = loadExistingEnv(lab);
        vars.forEach(v => {
            if (existing[v.key]) v.value = existing[v.key];
        });
        if (vars.length > 0) {
            setEnvVars(vars);
            setView('config');
        } else {
            startDeploy({});
        }
    };

    const startDeploy = async (values: Record<string, string>) => {
        if (!selectedLab) return;
        saveEnvFile(selectedLab, values);
        setView('deploying');
        setLogs(['Starting deployment...']);
        setContainerStatus([]);
        setDeployError(null);
        try {
            await deployLab(selectedLab.path, values, (log) => setLogs(prev => [...prev.slice(-50), log.trim()]));
            const status = await getLabStatus(selectedLab.path);
            setContainerStatus(status);
            setView('active');
        } catch (e: any) {
            setDeployError(e.message);
            setView('details');
        }
    };

    if (showIntro) {
        return <IntroAnimation onComplete={() => setShowIntro(false)} />;
    }

    if (labs.length === 0) return <Text>Loading Labs Catalog...</Text>;

    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
            <Header />

            {/* GROUPS VIEW (Garden Cards) */}
            {view === 'groups' && (
                <Box flexDirection="column">
                    {/* ACTIVE APPS SECTION */}
                    <Box
                        marginBottom={1}
                        borderStyle={focusArea === 'apps' ? "double" : "single"}
                        borderColor={focusArea === 'apps' ? "cyan" : "gray"}
                        flexDirection="column"
                        paddingX={1}
                    >
                        <Text bold color={focusArea === 'apps' ? "cyan" : "gray"}>YOUR ACTIVE APPS ({installedLabs.length}):</Text>
                        <Box flexDirection="row" flexWrap="wrap" marginTop={1}>
                            {installedLabs.length > 0 ? (
                                installedLabs.map((lab, i) => {
                                    const status = appStatuses[lab.id] || [];
                                    const isRunning = status.some(s => s.state.startsWith('running'));
                                    const isSelected = focusArea === 'apps' && i === activeAppIndex;

                                    return (
                                        <Box
                                            key={lab.id}
                                            marginRight={2}
                                            padding={1}
                                            borderStyle={isSelected ? "round" : "single"}
                                            borderColor={isSelected ? "yellow" : "green"}
                                        >
                                            <Text color={isRunning ? "green" : "red"}>{isRunning ? "●" : "○"}</Text>
                                            <Text bold color={isSelected ? "yellow" : "white"}> {lab.name}</Text>
                                        </Box>
                                    );
                                })
                            ) : (
                                <Text dimColor italic>No apps installed yet. Plant some seeds below!</Text>
                            )}
                        </Box>
                        {focusArea === 'apps' && (
                            <Box marginTop={1}>
                                <Text dimColor>Enter to Manage | Arrows to Navigate | Down to Categories</Text>
                            </Box>
                        )}
                    </Box>

                    <Box marginBottom={1} justifyContent="space-between" width="100%">
                        <Text bold underline color={focusArea === 'groups' ? "white" : "gray"}>Select a Garden Patch:</Text>
                        <Text dimColor>{selectedGroupIndex + 1} / {GROUPS.length}</Text>
                    </Box>
                    <Box flexDirection="column">
                        {/* Up Scroll Indicator */}
                        {groupScrollOffset > 0 && (
                            <Box justifyContent="center" marginBottom={0}><Text color="gray">▲ More ▲</Text></Box>
                        )}
                        <Box flexDirection="row" flexWrap="wrap">
                            {GROUPS.slice(groupScrollOffset * COLUMNS, (groupScrollOffset + VISIBLE_ROWS) * COLUMNS).map((group, i) => {
                                const realIndex = (groupScrollOffset * COLUMNS) + i;
                                const isSelected = focusArea === 'groups' && realIndex === selectedGroupIndex;
                                return (
                                    <Box
                                        key={group.id}
                                        width="50%" // Grid 2 columns
                                        padding={1}
                                        borderStyle={isSelected ? "double" : "single"}
                                        borderColor={isSelected ? group.color : "gray"}
                                    >
                                        <Box flexDirection="column" marginLeft={1}>
                                            <Text bold color={group.color}>
                                                {group.icon} {group.label}
                                            </Text>
                                            <Text dimColor>{group.description}</Text>
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Box>
                        {/* Down Scroll Indicator */}
                        {((groupScrollOffset + VISIBLE_ROWS) * COLUMNS) < GROUPS.length && (
                            <Box justifyContent="center" marginTop={0}><Text color="gray">▼ More ▼</Text></Box>
                        )}
                    </Box>
                    <Box marginTop={1}>
                        <Text dimColor>Use Arrows to explore, Enter to visit.</Text>
                    </Box>
                </Box>
            )}

            {/* LIST VIEW (Inside a Category) */}
            {view === 'list' && activeGroup && (
                <Box flexDirection="column">
                    <Box flexDirection="row" borderStyle="single" borderColor={activeGroup.color} marginBottom={1} paddingX={1}>
                        <Text bold color={activeGroup.color}>{activeGroup.icon} {activeGroup.label}</Text>
                        <Text>  |  Search: </Text>
                        <TextInput value={searchQuery} onChange={setSearchQuery} placeholder="Filter..." />
                    </Box>

                    <Box flexDirection="row">
                        {/* LEFT: LIST */}
                        <Box flexDirection="column" width="40%" marginRight={2} borderStyle="single" borderColor="gray" minHeight={10}>
                            {currentGroupLabs.map((lab, i) => (
                                <Box key={lab.id} paddingX={1}>
                                    <Text color={i === selectedLabIndex ? activeGroup.color : "white"}>
                                        {i === selectedLabIndex ? "> " : "  "} {lab.name}
                                    </Text>
                                </Box>
                            ))}
                            {currentGroupLabs.length === 0 && <Text italic dimColor>  No labs found.</Text>}
                        </Box>

                        {/* RIGHT: DESCRIPTION CARD */}
                        <Box flexDirection="column" width="60%" borderStyle="round" borderColor={activeGroup.color} padding={1}>
                            {currentGroupLabs[selectedLabIndex] ? (
                                <>
                                    <Text bold underline color={activeGroup.color}>{currentGroupLabs[selectedLabIndex].name}</Text>
                                    <Box marginTop={1}>
                                        <Text>{currentGroupLabs[selectedLabIndex].description || "No description available."}</Text>
                                    </Box>
                                    <Box marginTop={2}>
                                        <Text dimColor>Path: {currentGroupLabs[selectedLabIndex].path}</Text>
                                        <Text color={fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? "green" : "gray"}>
                                            Status: {fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? "INSTALLED (Running or Stopped)" : "Not Installed"}
                                        </Text>
                                    </Box>
                                </>
                            ) : (
                                <Text dimColor>Select a tool to see details.</Text>
                            )}
                        </Box>
                    </Box>
                    <Box marginTop={1}>
                        {/* Dynamic Help Text */}
                        {currentGroupLabs[selectedLabIndex] && fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? (
                            <Text>Esc to Back | <Text color="yellow" bold>Enter to RECONFIGURE/DEPLOY</Text></Text>
                        ) : (
                            <Text>Esc to Back | <Text color="green" bold>Enter to INSTALL</Text></Text>
                        )}
                    </Box>
                </Box>
            )}

            {/* DOWNLOADING VIEW */}
            {view === 'downloading' && (
                <Box flexDirection="column" alignItems="center" justifyContent="center" height={10}>
                    <Text color="cyan" bold>Planting Seeds... (Downloading)</Text>
                    <Text>{downloadStatus}</Text>
                </Box>
            )}

            {/* CONFIG VIEW */}
            {view === 'config' && (
                <EnvForm vars={envVars} onSubmit={startDeploy} onCancel={() => setView('list')} />
            )}

            {/* ACTIVE/DEPLOYING/MANAGE VIEW */}
            {(view === 'deploying' || view === 'active' || view === 'manage') && (
                <Box flexDirection="column">
                    <Text color="orange" bold>
                        {view === 'deploying' ? 'Deploying...' :
                            view === 'active' ? 'Deployment Successful!' :
                                `Managing ${selectedLab?.name}`}
                    </Text>
                    {containerStatus.map((c, i) => (
                        <Box key={i} flexDirection="column" marginTop={1} borderStyle="single" borderColor="green" padding={1}>
                            <Text color="green" bold>✔ {c.name}</Text>
                            <Text>Status: {c.state}</Text>
                            <Text>Ports: {c.ports || 'N/A'}</Text>
                        </Box>
                    ))}
                    <Box borderStyle="single" padding={1} flexDirection="column" borderColor="green" height={8} marginTop={1}>
                        <Text underline>Logs:</Text>
                        {logs.slice(-5).map((log, i) => <Text key={i}>{log}</Text>)}
                    </Box>
                    <Box marginTop={1}>
                        <Text dimColor>Press S to Stop | R to Reconfigure | Esc to Back</Text>
                    </Box>
                </Box>
            )}

            {/* DETAIL VIEW (Error Fallback) */}
            {view === 'details' && deployError && (
                <Box flexDirection="column" borderColor="red" borderStyle="double" padding={1}>
                    <Text bold color="red">Error Occurred:</Text>
                    <Text>{deployError}</Text>
                    <Text dimColor>Press Esc to return.</Text>
                </Box>
            )}

            {/* RIVER FOOTER */}
            <Box marginTop={1} flexDirection="column" alignItems="center">
                <Text color="cyan">~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~</Text>
                <Text color="blue">  ~ ~   ~   <Text color="white">🐟</Text>   ~ ~ ~      ~ <Text color="white">🦆</Text> ~      ~ ~ ~   ~ ~    ~ ~   <Text color="white">🛥️</Text>   ~ ~ ~   ~ ~ ~  </Text>
                <Text color="cyan">~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~</Text>
                <Text color="green"> 🌳  🐞  🌾     🌿    🍄     🌱      🐇      🌼      🌲     🐌     🌱    🦟     🌳 </Text>
            </Box>
        </Box>
    );
};

export default App;
