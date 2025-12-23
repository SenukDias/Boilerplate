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
const App = () => {
    const { exit } = useApp();
    const [labs, setLabs] = useState([]);
    const [view, setView] = useState('list');
    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectIndex, setSelectIndex] = useState(0);
    // Deployment State
    const [selectedLab, setSelectedLab] = useState(null);
    const [envVars, setEnvVars] = useState([]);
    const [logs, setLogs] = useState([]);
    const [deployError, setDeployError] = useState(null);
    const [containerStatus, setContainerStatus] = useState([]);
    const [downloadStatus, setDownloadStatus] = useState('');
    useEffect(() => {
        getLabs().then(setLabs);
    }, []);
    // Derived list of processed labs (Featured handling + Filtering + Grouping)
    const processedLabs = React.useMemo(() => {
        let processed = labs.map(l => {
            let sortKey = '';
            let displayCat = l.category;
            // 1. Featured Section
            if (FEATURED_IDS.includes(l.id) || FEATURED_IDS.includes(l.name.toLowerCase())) {
                sortKey = 'A_00';
                displayCat = '★ FEATURED';
            }
            // 2. Vulnerable Section
            else if (l.category.startsWith('Vulnerable-') || l.category === 'Red-Teaming') {
                // Group them together, but maintain sub-categories
                // 'Vulnerable-Web' -> 'B_Web'
                // 'Red-Teaming' -> 'B_RedTeaming'
                sortKey = `B_${l.category}`;
                displayCat = l.category; // e.g. "Vulnerable-Web"
            }
            // 3. General Catalog
            else {
                sortKey = `C_${l.category}`;
                displayCat = l.category;
            }
            return {
                ...l,
                displayCategory: displayCat,
                sortKey: sortKey + `_${l.name}`
            };
        });
        if (searchQuery) {
            processed = processed.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.category.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return processed.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [labs, searchQuery]);
    useInput((input, key) => {
        if (view === 'deploying' || view === 'downloading')
            return;
        if (key.escape) {
            if (view === 'list') {
                if (searchQuery)
                    setSearchQuery(''); // Clear search first
                else
                    exit();
            }
            else
                setView('list');
        }
        if (view === 'list') {
            if (key.upArrow) {
                setSelectIndex(prev => Math.max(0, prev - 1));
            }
            if (key.downArrow) {
                setSelectIndex(prev => Math.min(processedLabs.length - 1, prev + 1));
            }
            if (key.return) {
                if (processedLabs[selectIndex]) {
                    setSelectedLab(processedLabs[selectIndex]);
                    setView('details');
                }
            }
        }
        if (view === 'details') {
            if (key.return) { // Install / Configure
                if (selectedLab) {
                    if (fs.existsSync(selectedLab.path)) {
                        // Already exists, go to config
                        prepareConfig(selectedLab);
                    }
                    else {
                        // Need to download
                        startDownload(selectedLab);
                    }
                }
            }
            if (input === 's' && selectedLab && fs.existsSync(selectedLab.path)) {
                stopLab(selectedLab.path, (log) => setLogs(prev => [...prev.slice(-50), log]))
                    .then(() => setLogs(prev => [...prev, 'Stopped.']))
                    .catch(e => setLogs(prev => [...prev, e.message]));
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
            // Short delay to show success
            setTimeout(() => {
                prepareConfig(lab);
            }, 1000);
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
            await deployLab(selectedLab.path, values, (log) => {
                setLogs(prev => [...prev.slice(-50), log.trim()]);
            });
            const status = await getLabStatus(selectedLab.path);
            setContainerStatus(status);
            setView('active');
        }
        catch (e) {
            setDeployError(e.message);
            setView('details'); // Go back to details to show error
        }
    };
    if (labs.length === 0) {
        return React.createElement(Text, null, "Loading Labs Catalog...");
    }
    // Render Logic
    return (React.createElement(Box, { flexDirection: "column", padding: 1, borderStyle: "round", borderColor: "green" },
        React.createElement(Header, null),
        view === 'list' && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { borderStyle: "single", borderColor: "green", marginBottom: 1, paddingX: 1 },
                React.createElement(Text, { color: "green" }, "Search: "),
                React.createElement(TextInput, { value: searchQuery, onChange: (val) => {
                        setSearchQuery(val);
                        setSelectIndex(0);
                    }, placeholder: "Type to filter..." })),
            React.createElement(Box, { flexDirection: "column", height: 15 }, processedLabs.slice(Math.max(0, selectIndex - 7), Math.max(0, selectIndex - 7) + 15).map((lab, i) => {
                // Calculate actual index in the full list
                const actualIndex = Math.max(0, selectIndex - 7) + i;
                // Check for header (if first item or category changed)
                const showHeader = actualIndex === 0 || lab.displayCategory !== processedLabs[actualIndex - 1]?.displayCategory;
                return (React.createElement(Box, { key: lab.id, flexDirection: "column" },
                    showHeader && (React.createElement(Box, { marginTop: 1, marginBottom: 0 },
                        React.createElement(Text, { underline: true, bold: true, color: lab.displayCategory.includes('FEATURED') ? "yellow" : (lab.displayCategory.startsWith('Vulnerable') || lab.displayCategory === 'Red-Teaming') ? "red" : "green" }, lab.displayCategory.toUpperCase()))),
                    React.createElement(Box, { justifyContent: "space-between" },
                        React.createElement(Text, { color: actualIndex === selectIndex ? "cyan" : "white" },
                            actualIndex === selectIndex ? "> " : "  ",
                            lab.name),
                        React.createElement(Text, { color: "dimColor" }, lab.displayCategory === 'AAA_FEATURED' ? lab.category : ''))));
            })),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true },
                    "Arrows to move, Enter to install/select (Total: ",
                    processedLabs.length,
                    ")")))),
        view === 'details' && selectedLab && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true, color: "orange" }, selectedLab.name),
            React.createElement(Box, { borderStyle: "single", borderColor: "orange", padding: 1 },
                React.createElement(Text, null, selectedLab.description),
                React.createElement(Text, { dimColor: true },
                    "Target Path: ",
                    selectedLab.path),
                React.createElement(Text, { color: fs.existsSync(selectedLab.path) ? "green" : "yellow" },
                    "Status: ",
                    fs.existsSync(selectedLab.path) ? "Installed" : "Not Installed")),
            deployError && React.createElement(Text, { color: "red", bold: true },
                "Error: ",
                deployError),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { inverse: true, color: "green" },
                    " [ ENTER TO ",
                    fs.existsSync(selectedLab.path) ? 'CONFIGURE' : 'INSTALL',
                    " ] "),
                React.createElement(Text, null, "  "),
                fs.existsSync(selectedLab.path) && React.createElement(Text, { inverse: true, color: "red" }, " [ S TO STOP ] ")))),
        view === 'downloading' && (React.createElement(Box, { flexDirection: "column", alignItems: "center", justifyContent: "center", height: 10 },
            React.createElement(Text, { color: "cyan", bold: true }, "Downloading Lab..."),
            React.createElement(Text, null, downloadStatus))),
        view === 'config' && (React.createElement(EnvForm, { vars: envVars, onSubmit: startDeploy, onCancel: () => setView('details') })),
        (view === 'deploying' || view === 'active') && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "orange", bold: true }, view === 'deploying' ? 'Deploying...' : 'Deployment Successful!'),
            view === 'active' && containerStatus.length > 0 && (React.createElement(Box, { flexDirection: "column", borderStyle: "single", borderColor: "cyan", padding: 1, marginY: 1 },
                React.createElement(Text, { underline: true }, "Service Status:"),
                containerStatus.map((c, i) => (React.createElement(Box, { key: i, flexDirection: "column", marginTop: 1 },
                    React.createElement(Text, { color: "green", bold: true },
                        "\u2714 ",
                        c.name),
                    React.createElement(Text, null,
                        "  State: ",
                        c.state),
                    React.createElement(Text, null,
                        "  Access: ",
                        c.ports || 'Internal Only')))))),
            React.createElement(Box, { borderStyle: "single", padding: 1, flexDirection: "column", borderColor: "green", height: 10 },
                React.createElement(Text, { underline: true }, "Logs:"),
                logs.slice(-8).map((log, i) => React.createElement(Text, { key: i }, log))),
            view === 'active' && React.createElement(Text, { dimColor: true }, "Press Esc to back"))),
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
