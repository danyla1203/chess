import * as React from 'react';
import { Navigate } from 'react-router-dom';

export const Signup = () => {
  const [ email, setEmail ] = React.useState('');
  const [ name, setName ] = React.useState('');
  const [ password, setPassword ] = React.useState('');
  const [ isLoaded, setLoadStatus ] = React.useState(null);
  const [ err, setErr ] = React.useState(null);

  const signup = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = JSON.stringify({ email, password, deviceId, name });
    fetch('http://localhost:3000/signup', { method: 'POST', body: payload, headers: { accept: 'application/json' } })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.error) {
          setErr(payload.error);
          setLoadStatus(true);
        }
        else setLoadStatus(true);
      })
      .catch((err) => setErr(err));
    setLoadStatus(false);
  };

  if (isLoaded === false) return <div>Loading...</div>;
  else if (isLoaded === true && err === null) return <Navigate to='/' />;
  return (
    <div className="signup">
      <div className="signup_form">
        <input type="text" value={name} onChange={(e: any) => setName(e.target.value)}/>
        <input type="text" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
        <button onClick={signup}>Sign up</button>
      </div>
      { err }
    </div>
  );
};