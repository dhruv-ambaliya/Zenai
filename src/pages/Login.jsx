import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Reuse existing styles or create new

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');


    try {
      const response = await api.login({ username, password });
      if (response.success) {
        login(response.user);
        if (response.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/installer');
        }
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Login failed. Please check server.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Zenai Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f0f2f5;
        }
        .login-box {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .login-btn {
          width: 100%;
          padding: 0.75rem;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .error-msg {
          color: red;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .login-box {
            margin: 0 20px;
            padding: 1.5rem;
          }
        }
        @media (max-width: 480px) {
          .login-box {
            margin: 0 15px;
            padding: 1.25rem;
          }
          .login-box h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Login;
