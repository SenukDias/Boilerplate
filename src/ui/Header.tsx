import React from 'react';
import { Box } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

const Header = () => {
    return (
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Gradient name="morning">
                <BigText text="SENUK'S" align='center' font='simple' />
                <BigText text="BOILERPLATE" align='center' font='simple' />
            </Gradient>
        </Box>
    );
};

export default Header;
