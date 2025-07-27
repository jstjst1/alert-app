// Import React library — needed for defining React components
import React from 'react';

// Define the App component as a function
// This is the main/root component of your React app
function App() {
  // The component returns JSX (React’s HTML like syntax)
  return (
    // React fragment <>...</> allows grouping elements without adding extra nodes to the DOM
    <>
      {/* Main heading of the app */}
      <h1>Welcome to the Alert App</h1>

      {/* Paragraph explaining the app */}
      <p>This app sends you notifications about the latest critical geopolitical, financial, and religious news.</p>

      {/* You can add more UI elements here, e.g. buttons, lists, etc. */}
    </>
  );
}

// Export the App component so it can be imported elsewhere (e.g., in index.jsx)
export default App;