#!/bin/bash

echo "🚀 Desplegando frontend del chatbot..."

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Desplegar infraestructura con Terraform
echo "🏗️ Desplegando infraestructura AWS..."
terraform init
terraform plan
terraform apply -auto-approve

# Obtener configuración de Cognito y S3
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(terraform output -raw cognito_client_id)
BUCKET_NAME=$(terraform output -raw bucket_name)
PICTURES_BUCKET=$(terraform output -raw pictures_bucket_name)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain)

# Crear archivo de configuración de entorno
echo "⚙️ Configurando variables de entorno..."
cat > .env << EOF
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_CLIENT_ID=$CLIENT_ID
REACT_APP_PICTURES_BUCKET=$PICTURES_BUCKET
EOF

# Construir la aplicación con las variables de entorno
echo "🔨 Construyendo aplicación React..."
npm run build

# Subir archivos a S3
echo "📤 Subiendo archivos a S3..."
aws s3 sync build/ s3://$BUCKET_NAME --delete

# Invalidar caché de CloudFront
echo "🔄 Invalidando caché de CloudFront..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3-website-us-east-1.amazonaws.com'].Id" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ Despliegue completado!"
echo "🌐 URL de la aplicación: https://$CLOUDFRONT_DOMAIN"
echo "👤 Usuario: admin"
echo "🔑 Contraseña: pass123"
