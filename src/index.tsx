import * as React from 'react';
import ReactDOM = require('react-dom');
export interface HelloWorldProps {
  userName: string;
  lang: string;
}
const App = () => (
  <h1>
    Hellow World
  </h1>
);

ReactDOM.render(<App />, document.getElementById('output'));
