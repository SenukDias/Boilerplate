import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
const Header = () => {
    return (React.createElement(Box, { flexDirection: "column", alignItems: "center", marginBottom: 1 },
        React.createElement(Box, null,
            React.createElement(Text, { color: "#87CEEB" }, "                  .   .                 .   .   ")),
        React.createElement(Box, null,
            React.createElement(Text, { color: "#87CEEB" }, "         Top of the Morning!   \uD83D\uDC26   v   v     v ")),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { italic: true, color: "gray" }, "senuk's")),
        React.createElement(Gradient, { name: "summer" },
            React.createElement(BigText, { text: "BOILERPLATES", align: 'center', font: 'block' })),
        React.createElement(Box, null,
            React.createElement(Text, { color: "green" }, "  Create your own digital garden.  \uD83C\uDF31  \uD83C\uDF3F  \uD83C\uDF33 "))));
};
export default Header;
