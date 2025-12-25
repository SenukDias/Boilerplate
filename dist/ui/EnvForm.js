import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
const EnvForm = ({ vars, onSubmit, onCancel }) => {
    const [values, setValues] = useState({});
    const [focusedIndex, setFocusedIndex] = useState(0);
    useEffect(() => {
        const initial = {};
        vars.forEach(v => {
            initial[v.key] = v.defaultValue || v.value || '';
        });
        setValues(initial);
    }, [vars]);
    useInput((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }
        if (key.upArrow) {
            setFocusedIndex(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setFocusedIndex(prev => Math.min(vars.length, prev + 1));
        }
        if (key.return) {
            if (focusedIndex === vars.length) {
                onSubmit(values);
            }
            else {
                // Move to next field on Enter
                setFocusedIndex(prev => Math.min(vars.length, prev + 1));
            }
        }
    });
    return (React.createElement(Box, { flexDirection: "column", borderStyle: "double", borderColor: "magenta", padding: 1 },
        React.createElement(Text, { bold: true, color: "magenta", underline: true }, "Configuration"),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 }, vars.map((v, i) => (React.createElement(Box, { key: v.key, flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, { color: i === focusedIndex ? "cyan" : "white", bold: i === focusedIndex },
                    i === focusedIndex ? "> " : "  ",
                    " ",
                    v.key),
                React.createElement(Text, { color: v.required ? "red" : "gray" }, v.required ? '(Required)' : '(Optional)')),
            React.createElement(Box, { borderStyle: "single", borderColor: i === focusedIndex ? "cyan" : "gray", marginLeft: 2, paddingX: 1 }, i === focusedIndex ? (React.createElement(TextInput, { value: values[v.key] || '', onChange: (val) => setValues({ ...values, [v.key]: val }), placeholder: v.defaultValue })) : (React.createElement(Text, { color: values[v.key] ? "white" : "gray" }, values[v.key] || (v.defaultValue ? `${v.defaultValue}` : '')))),
            i === focusedIndex && v.defaultValue && (React.createElement(Box, { marginLeft: 2, marginTop: 0 },
                React.createElement(Text, { color: "yellow", dimColor: true },
                    "\u2728 Magic Value: ",
                    v.defaultValue))))))),
        React.createElement(Box, { marginTop: 2, justifyContent: "center" },
            React.createElement(Box, { borderStyle: focusedIndex === vars.length ? "round" : undefined, borderColor: "green", paddingX: 2 },
                React.createElement(Text, { color: focusedIndex === vars.length ? "green" : "gray", bold: focusedIndex === vars.length }, "[ DEPLOY NOW ]")))));
};
export default EnvForm;
