import React, { useState } from 'https://esm.sh/react';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
import App from '/components/App.js'

const insertForm = createRoot(document.getElementById('insertForm'));
console.log('rendering');
insertForm.render(<App />);
