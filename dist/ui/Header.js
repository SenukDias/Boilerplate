import React from 'react';
import { Box } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
const Header = () => {
    return (React.createElement(Box, { flexDirection: "column", alignItems: "center", marginBottom: 1 },
        React.createElement(Gradient, { name: "morning" },
            React.createElement(BigText, { text: "SENUK'S", align: 'center', font: 'simple' }),
            React.createElement(BigText, { text: "BOILERPLATE", align: 'center', font: 'simple' }))));
};
export default Header;
