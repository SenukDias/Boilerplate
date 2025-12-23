import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { getLabs } from '../lib/labs.js';
import { getRequiredEnvVars, saveEnvFile, loadExistingEnv } from '../lib/env.js';
import { deployLab, stopLab } from '../lib/docker.js';
import EnvForm from './EnvForm.js';
import Header from './Header.js';
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
    useEffect(() => {
        setLabs(getLabs());
    }, []);
    // Derived list of filtered labs
    const filteredLabs = labs.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase()));
    // Create categorized map for display (only if not searching strictly?)
    // Actually, simple list with category headers is easier for navigation with search
    useInput((input, key) => {
        if (view === 'deploying')
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
                setSelectIndex(prev => Math.min(filteredLabs.length - 1, prev + 1));
            }
            // Page Up/Down could go here
            if (key.return) {
                if (filteredLabs[selectIndex]) {
                    setSelectedLab(filteredLabs[selectIndex]);
                    setView('details');
                }
            }
        }
        if (view === 'details') {
            if (key.return) { // Configure
                if (selectedLab) {
                    const vars = getRequiredEnvVars(selectedLab);
                    const existing = loadExistingEnv(selectedLab);
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
                }
            }
            if (input === 's' && selectedLab) {
                stopLab(selectedLab.path, (log) => setLogs(prev => [...prev.slice(-10), log]))
                    .then(() => setLogs(prev => [...prev, 'Stopped.']))
                    .catch(e => setLogs(prev => [...prev, e.message]));
            }
        }
    });
    const startDeploy = async (values) => {
        if (!selectedLab)
            return;
        saveEnvFile(selectedLab, values);
        setView('deploying');
        setLogs(['Starting deployment...']);
        setDeployError(null);
        try {
            await deployLab(selectedLab.path, values, (log) => {
                setLogs(prev => [...prev.slice(-10), log.trim()]);
            });
            setView('active');
        }
        catch (e) {
            setDeployError(e.message);
            setView('details'); // Go back to details to show error
        }
    };
    if (labs.length === 0) {
        return React.createElement(Text, null,
            "No labs found in ",
            process.cwd(),
            "/labs");
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
            React.createElement(Text, { underline: true }, "Deployed Catalog:"),
            filteredLabs.slice(0, 15).map((lab, index) => ( // limit display
            React.createElement(Box, { key: lab.path, justifyContent: "space-between" },
                React.createElement(Text, { color: index === selectIndex ? "cyan" : "white" },
                    index === selectIndex ? "> " : "  ",
                    lab.name),
                React.createElement(Text, { color: "gray" },
                    "[",
                    lab.category,
                    "]")))),
            filteredLabs.length === 0 && React.createElement(Text, { italic: true }, "No labs found"),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Arrows to move, Enter to select, Type to search")))),
        view === 'details' && selectedLab && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true, color: "orange" }, selectedLab.name),
            React.createElement(Box, { borderStyle: "single", borderColor: "orange", padding: 1 },
                React.createElement(Text, null, selectedLab.description),
                React.createElement(Text, { dimColor: true },
                    "Path: ",
                    selectedLab.path)),
            deployError && React.createElement(Text, { color: "red", bold: true },
                "Error: ",
                deployError),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { inverse: true, color: "green" }, " [ ENTER TO DEPLOY ] "),
                React.createElement(Text, null, "  "),
                React.createElement(Text, { inverse: true, color: "red" }, " [ S TO STOP ] ")))),
        view === 'config' && (React.createElement(EnvForm, { vars: envVars, onSubmit: startDeploy, onCancel: () => setView('details') })),
        (view === 'deploying' || view === 'active') && (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "orange" }, view === 'deploying' ? 'Deploying...' : 'Active'),
            React.createElement(Box, { borderStyle: "single", padding: 1, flexDirection: "column", borderColor: "green" }, logs.map((log, i) => React.createElement(Text, { key: i }, log))),
            view === 'active' && React.createElement(Text, { color: "green", bold: true }, "Deployment Successful!"),
            view === 'active' && React.createElement(Text, { dimColor: true }, "Press Esc to back")))));
};
export default App;
