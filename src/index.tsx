#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './ui/App.js'; // Note the .js extension for NodeNext

const cli = meow(`
	Usage
	  $ senuks-boilerplate

	Options
		--name  Your name

	Examples
	  $ senuks-boilerplate --name=Jane
`, {
	importMeta: import.meta,
	flags: {
		name: {
			type: 'string'
		}
	}
});

// Run in alternate buffer mode (fullscreen) to prevent scrolling issues
// @ts-ignore
render(<App />, { alternateBuffer: true });
