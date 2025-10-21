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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    const botResponse = { text: `Respuesta automática a: ${input}`, sender: 'bot' };
    
    setMessages([...messages, userMessage, botResponse]);
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
      </div>
      
      <form onSubmit={sendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
        />
        <label className={`file-upload-btn ${uploading ? 'uploading' : ''}`}>
          {uploading ? '⏳' : '📷'}
          <input
            type="file"
            accept="image/png"
            capture="environment"
            onChange={handleImageUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default Chatbot;
