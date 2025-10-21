import React, { useState } from 'react';
import { cognito, cognitoConfig } from '../config/cognito';

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) return;

    setLoading(true);
    setError('');

    try {
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cognitoConfig.clientId,
        AuthParameters: {
          USERNAME: credentials.username,
          PASSWORD: credentials.password
        }
      };

      await cognito.initiateAuth(params).promise();
      onLogin();
    } catch (err) {
      setError('Usuario o contraseña incorrectos');
      console.error('Error de autenticación:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <img src="/novamarket.png" alt="Novamarket" className="logo" />
        <h2>Novi Chat</h2>
        <p>Novamarket</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <input
          type="text"
          placeholder="Usuario"
          value={credentials.username}
          onChange={(e) => setCredentials({...credentials, username: e.target.value})}
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={credentials.password}
          onChange={(e) => setCredentials({...credentials, password: e.target.value})}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default Login;
