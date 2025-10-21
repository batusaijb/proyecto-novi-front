import React, { useState } from 'react';
import AWS from 'aws-sdk';

// Configurar AWS SDK para S3
AWS.config.update({
  region: 'us-east-1'
});

const s3 = new AWS.S3();

function Chatbot({ onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('https://uuwyl5urj2.execute-api.us-west-2.amazonaws.com/prod/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      const botResponse = { 
        text: data.response || data.message || 'Respuesta del servidor', 
        sender: 'bot' 
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error al comunicarse con el API:', error);
      const errorResponse = { 
        text: 'Error al conectar con el servidor. Intenta nuevamente.', 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }

    setInput('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Solo se permiten archivos PNG');
      e.target.value = '';
      return;
    }

    setUploading(true);
    
    try {
      // Generar nombre único para el archivo
      const fileName = `${Date.now()}-${file.name}`;
      const bucketName = process.env.REACT_APP_PICTURES_BUCKET || 'novi-chat-pictures-b22qum7n';
      
      // Subir archivo a S3
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file,
        ContentType: file.type
      };

      await s3.upload(params).promise();
      
      // Mostrar mensaje de éxito
      const imageMessage = { 
        text: `📷 Imagen subida: ${file.name}`, 
        sender: 'user',
        image: URL.createObjectURL(file)
      };
      const botResponse = { 
        text: 'Imagen recibida y almacenada. Procesando tu reclamo...', 
        sender: 'bot' 
      };
      
      setMessages([...messages, imageMessage, botResponse]);
      
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen. Intenta nuevamente.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="chatbot-container">
      <header className="chat-header">
        <div className="header-content">
          <img src="/novamarket.png" alt="Novamarket" className="header-logo" />
          <h2>Novi Chat</h2>
        </div>
        <button onClick={onLogout} className="logout-btn">Salir</button>
      </header>
      
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.image && <img src={msg.image} alt="Adjunto" className="message-image" />}
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="message bot loading">
            <span>Novi está escribiendo...</span>
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
        />
        <label className={`file-upload-btn ${uploading ? 'uploading' : ''}`}>
          {uploading ? '⏳' : '📷'}
          <input
            type="file"
            accept="image/png"
            capture="environment"
            onChange={handleImageUpload}
            disabled={uploading || loading}
            style={{ display: 'none' }}
          />
        </label>
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '⏳' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}

export default Chatbot;
