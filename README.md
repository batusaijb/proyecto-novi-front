# Novi Chat - Novamarket Chatbot

Frontend React de Novi Chat (servicio de chatbot de Novamarket) desplegado en AWS CloudFront + S3.

## Estructura del Proyecto

```
├── src/
│   ├── components/
│   │   ├── Login.js      # Pantalla de login
│   │   └── Chatbot.js    # Interfaz del chatbot
│   ├── App.js            # Componente principal con routing
│   ├── App.css           # Estilos
│   └── index.js          # Punto de entrada
├── public/
│   └── index.html        # HTML base
├── infrastructure.tf     # Configuración de AWS (S3 + CloudFront)
└── deploy.sh            # Script de despliegue automatizado
```

## Despliegue Rápido

```bash
# Ejecutar despliegue completo
./deploy.sh
```

## Despliegue Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Construir aplicación
npm run build

# 3. Desplegar infraestructura
terraform init
terraform apply

# 4. Subir archivos a S3
BUCKET_NAME=$(terraform output -raw bucket_name)
aws s3 sync build/ s3://$BUCKET_NAME --delete
```

## Funcionalidades

- **Login**: Autenticación con AWS Cognito (usuario: admin, contraseña: pass123)
- **Chatbot**: Interfaz de chat con respuestas automáticas
- **Adjuntar imágenes**: Soporte para archivos PNG desde galería o cámara del celular
- **Routing**: Navegación protegida entre login y chat
- **Responsive**: Diseño optimizado para móviles y desktop

## Arquitectura AWS

- **S3**: Almacena archivos estáticos del frontend
- **CloudFront**: CDN global para distribución rápida
- **Terraform**: Infraestructura como código

La aplicación estará disponible en la URL de CloudFront que se muestra al finalizar el despliegue.
