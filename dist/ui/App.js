import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import { getLabs } from '../lib/labs.js';
import { getRequiredEnvVars, saveEnvFile, loadExistingEnv } from '../lib/env.js';
import { deployLab, stopLab, getLabStatus } from '../lib/docker.js';
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
const GROUPS = [
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
    const [labs, setLabs] = useState([]);
    // Intro State
    const [showIntro, setShowIntro] = useState(true);
    // View State
    const [view, setView] = useState('groups');
    // Group Selection State
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    // List Selection State
    const [selectedLabIndex, setSelectedLabIndex] = useState(0);
    const [activeGroup, setActiveGroup] = useState(null);
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    // Deployment State
    const [selectedLab, setSelectedLab] = useState(null);
    const [envVars, setEnvVars] = useState([]);
    const [logs, setLogs] = useState([]);
    const [deployError, setDeployError] = useState(null);
    const [containerStatus, setContainerStatus] = useState([]);
    const [downloadStatus, setDownloadStatus] = useState('');
    // App Status State
    const [appStatuses, setAppStatuses] = useState({});
    const [focusArea, setFocusArea] = useState('groups');
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
            const statusMap = {};
            const installed = labs.filter(l => fs.existsSync(l.path));
            for (const lab of installed) {
                try {
                    const status = await getLabStatus(lab.path);
                    statusMap[lab.id] = status;
                }
                catch (e) {
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
        if (!activeGroup)
            return [];
        let filtered = labs.filter(activeGroup.filter);
        if (searchQuery) {
            filtered = filtered.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [activeGroup, labs, searchQuery]);
    useInput((input, key) => {
        if (showIntro || view === 'deploying' || view === 'downloading')
            return;
        // Global Back Navigation
        if (key.escape) {
            if (view === 'list') {
                setView('groups');
                setSearchQuery('');
            }
            else if (view === 'groups') {
                exit();
            }
            else if (view === 'details' || view === 'config') {
                setView('list');
            }
            else if (view === 'manage') {
                setView('groups');
            }
            else {
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
                    }
                    else {
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
                if (key.leftArrow)
                    setSelectedGroupIndex(prev => Math.max(0, prev - 1));
                if (key.rightArrow)
                    setSelectedGroupIndex(prev => Math.min(GROUPS.length - 1, prev + 1));
                if (key.return) {
                    setActiveGroup(GROUPS[selectedGroupIndex]);
                    setSelectedLabIndex(0);
                    setView('list');
                }
            }
            else if (focusArea === 'apps') {
                // Navigation within active apps
                if (key.leftArrow)
                    setActiveAppIndex(prev => Math.max(0, prev - 1));
                if (key.rightArrow)
                    setActiveAppIndex(prev => Math.min(installedLabs.length - 1, prev + 1));
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
            if (key.upArrow)
                setSelectedLabIndex(prev => Math.max(0, prev - 1));
            if (key.downArrow)
                setSelectedLabIndex(prev => Math.min(currentGroupLabs.length - 1, prev + 1));
            if (key.return) {
                if (currentGroupLabs[selectedLabIndex]) {
                    setSelectedLab(currentGroupLabs[selectedLabIndex]);
                    const lab = currentGroupLabs[selectedLabIndex];
                    if (fs.existsSync(lab.path)) {
                        prepareConfig(lab);
                    }
                    else {
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
    const startDownload = async (lab) => {
        setView('downloading');
        setDownloadStatus(`Initializing download for ${lab.name}...`);
        try {
            setDownloadStatus(`Fetching files from remote repository...`);
            await setupLabLocally(lab.category, lab.id, lab.files);
            setDownloadStatus('Download complete!');
            await new Promise(resolve => setTimeout(resolve, 1000));
            prepareConfig(lab);
        }
        catch (e) {
            setDeployError(`Download failed: ${e.message}`);
            setView('details');
        }
    };
    const prepareConfig = (lab) => {
        const vars = getRequiredEnvVars(lab);
        const existing = loadExistingEnv(lab);
        vars.forEach(v => {
            if (existing[v.key])
                v.value = existing[v.key];
        });
        if (vars.length > 0) {
            setEnvVars(vars);
            setView('config');
        }
        else {
            startDeploy({});
        }
    };
    const startDeploy = async (values) => {
        if (!selectedLab)
            return;
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
        }
        catch (e) {
            setDeployError(e.message);
            setView('details');
        }
    };
    if (showIntro) {
        return React.createElement(IntroAnimation, { onComplete: () => setShowIntro(false) });
    }
    if (labs.length === 0)
        return React.createElement(Text, null, "Loading Labs Catalog...");
    return (React.createElement(Box, { flexDirection: "column", padding: 1, borderStyle: "round", borderColor: "green" },
        React.createElement(Header, null),
        view === 'groups' && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1, borderStyle: focusArea === 'apps' ? "double" : "single", borderColor: focusArea === 'apps' ? "cyan" : "gray", flexDirection: "column", paddingX: 1 },
                React.createElement(Text, { bold: true, color: focusArea === 'apps' ? "cyan" : "gray" },
                    "YOUR ACTIVE APPS (",
                    installedLabs.length,
                    "):"),
                React.createElement(Box, { flexDirection: "row", flexWrap: "wrap", marginTop: 1 }, installedLabs.length > 0 ? (installedLabs.map((lab, i) => {
                    const status = appStatuses[lab.id] || [];
                    const isRunning = status.some(s => s.state.startsWith('running'));
                    const isSelected = focusArea === 'apps' && i === activeAppIndex;
                    return (React.createElement(Box, { key: lab.id, marginRight: 2, padding: 1, borderStyle: isSelected ? "round" : "single", borderColor: isSelected ? "yellow" : "green" },
                        React.createElement(Text, { color: isRunning ? "green" : "red" }, isRunning ? "●" : "○"),
                        React.createElement(Text, { bold: true, color: isSelected ? "yellow" : "white" },
                            " ",
                            lab.name)));
                })) : (React.createElement(Text, { dimColor: true, italic: true }, "No apps installed yet. Plant some seeds below!"))),
                focusArea === 'apps' && (React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { dimColor: true }, "Enter to Manage | Arrows to Navigate | Down to Categories")))),
            React.createElement(Box, { marginBottom: 1, justifyContent: "space-between", width: "100%" },
                React.createElement(Text, { bold: true, underline: true, color: focusArea === 'groups' ? "white" : "gray" }, "Select a Garden Patch:"),
                React.createElement(Text, { dimColor: true },
                    selectedGroupIndex + 1,
                    " / ",
                    GROUPS.length)),
            React.createElement(Box, { flexDirection: "column" },
                groupScrollOffset > 0 && (React.createElement(Box, { justifyContent: "center", marginBottom: 0 },
                    React.createElement(Text, { color: "gray" }, "\u25B2 More \u25B2"))),
                React.createElement(Box, { flexDirection: "row", flexWrap: "wrap" }, GROUPS.slice(groupScrollOffset * COLUMNS, (groupScrollOffset + VISIBLE_ROWS) * COLUMNS).map((group, i) => {
                    const realIndex = (groupScrollOffset * COLUMNS) + i;
                    const isSelected = focusArea === 'groups' && realIndex === selectedGroupIndex;
                    return (React.createElement(Box, { key: group.id, width: "50%" // Grid 2 columns
                        , padding: 1, borderStyle: isSelected ? "double" : "single", borderColor: isSelected ? group.color : "gray" },
                        React.createElement(Box, { flexDirection: "column", marginLeft: 1 },
                            React.createElement(Text, { bold: true, color: group.color },
                                group.icon,
                                " ",
                                group.label),
                            React.createElement(Text, { dimColor: true }, group.description))));
                })),
                ((groupScrollOffset + VISIBLE_ROWS) * COLUMNS) < GROUPS.length && (React.createElement(Box, { justifyContent: "center", marginTop: 0 },
                    React.createElement(Text, { color: "gray" }, "\u25BC More \u25BC")))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Use Arrows to explore, Enter to visit.")))),
        view === 'list' && activeGroup && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { flexDirection: "row", borderStyle: "single", borderColor: activeGroup.color, marginBottom: 1, paddingX: 1 },
                React.createElement(Text, { bold: true, color: activeGroup.color },
                    activeGroup.icon,
                    " ",
                    activeGroup.label),
                React.createElement(Text, null, "  |  Search: "),
                React.createElement(TextInput, { value: searchQuery, onChange: setSearchQuery, placeholder: "Filter..." })),
            React.createElement(Box, { flexDirection: "row" },
                React.createElement(Box, { flexDirection: "column", width: "40%", marginRight: 2, borderStyle: "single", borderColor: "gray", minHeight: 10 },
                    currentGroupLabs.map((lab, i) => (React.createElement(Box, { key: lab.id, paddingX: 1 },
                        React.createElement(Text, { color: i === selectedLabIndex ? activeGroup.color : "white" },
                            i === selectedLabIndex ? "> " : "  ",
                            " ",
                            lab.name)))),
                    currentGroupLabs.length === 0 && React.createElement(Text, { italic: true, dimColor: true }, "  No labs found.")),
                React.createElement(Box, { flexDirection: "column", width: "60%", borderStyle: "round", borderColor: activeGroup.color, padding: 1 }, currentGroupLabs[selectedLabIndex] ? (React.createElement(React.Fragment, null,
                    React.createElement(Text, { bold: true, underline: true, color: activeGroup.color }, currentGroupLabs[selectedLabIndex].name),
                    React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, null, currentGroupLabs[selectedLabIndex].description || "No description available.")),
                    React.createElement(Box, { marginTop: 2 },
                        React.createElement(Text, { dimColor: true },
                            "Path: ",
                            currentGroupLabs[selectedLabIndex].path),
                        React.createElement(Text, { color: fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? "green" : "gray" },
                            "Status: ",
                            fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? "INSTALLED (Running or Stopped)" : "Not Installed")))) : (React.createElement(Text, { dimColor: true }, "Select a tool to see details.")))),
            React.createElement(Box, { marginTop: 1 }, currentGroupLabs[selectedLabIndex] && fs.existsSync(currentGroupLabs[selectedLabIndex].path) ? (React.createElement(Text, null,
                "Esc to Back | ",
                React.createElement(Text, { color: "yellow", bold: true }, "Enter to RECONFIGURE/DEPLOY"))) : (React.createElement(Text, null,
                "Esc to Back | ",
                React.createElement(Text, { color: "green", bold: true }, "Enter to INSTALL")))))),
        view === 'downloading' && (React.createElement(Box, { flexDirection: "column", alignItems: "center", justifyContent: "center", height: 10 },
            React.createElement(Text, { color: "cyan", bold: true }, "Planting Seeds... (Downloading)"),
            React.createElement(Text, null, downloadStatus))),
        view === 'config' && (React.createElement(EnvForm, { vars: envVars, onSubmit: startDeploy, onCancel: () => setView('list') })),
        (view === 'deploying' || view === 'active' || view === 'manage') && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "orange", bold: true }, view === 'deploying' ? 'Deploying...' :
                view === 'active' ? 'Deployment Successful!' :
                    `Managing ${selectedLab?.name}`),
            containerStatus.map((c, i) => (React.createElement(Box, { key: i, flexDirection: "column", marginTop: 1, borderStyle: "single", borderColor: "green", padding: 1 },
                React.createElement(Text, { color: "green", bold: true },
                    "\u2714 ",
                    c.name),
                React.createElement(Text, null,
                    "Status: ",
                    c.state),
                React.createElement(Text, null,
                    "Ports: ",
                    c.ports || 'N/A')))),
            React.createElement(Box, { borderStyle: "single", padding: 1, flexDirection: "column", borderColor: "green", height: 8, marginTop: 1 },
                React.createElement(Text, { underline: true }, "Logs:"),
                logs.slice(-5).map((log, i) => React.createElement(Text, { key: i }, log))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Press S to Stop | R to Reconfigure | Esc to Back")))),
        view === 'details' && deployError && (React.createElement(Box, { flexDirection: "column", borderColor: "red", borderStyle: "double", padding: 1 },
            React.createElement(Text, { bold: true, color: "red" }, "Error Occurred:"),
            React.createElement(Text, null, deployError),
            React.createElement(Text, { dimColor: true }, "Press Esc to return."))),
        React.createElement(Box, { marginTop: 1, flexDirection: "column", alignItems: "center" },
            React.createElement(Text, { color: "cyan" }, "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"),
            React.createElement(Text, { color: "blue" },
                "  ~ ~   ~   ",
                React.createElement(Text, { color: "white" }, "\uD83D\uDC1F"),
                "   ~ ~ ~      ~ ",
                React.createElement(Text, { color: "white" }, "\uD83E\uDD86"),
                " ~      ~ ~ ~   ~ ~    ~ ~   ",
                React.createElement(Text, { color: "white" }, "\uD83D\uDEE5\uFE0F"),
                "   ~ ~ ~   ~ ~ ~  "),
            React.createElement(Text, { color: "cyan" }, "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"),
            React.createElement(Text, { color: "green" }, " \uD83C\uDF33  \uD83D\uDC1E  \uD83C\uDF3E     \uD83C\uDF3F    \uD83C\uDF44     \uD83C\uDF31      \uD83D\uDC07      \uD83C\uDF3C      \uD83C\uDF32     \uD83D\uDC0C     \uD83C\uDF31    \uD83E\uDD9F     \uD83C\uDF33 "))));
};
export default App;
