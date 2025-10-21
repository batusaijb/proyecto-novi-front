import AWS from 'aws-sdk';

// Configuración de Cognito - se actualizará después del despliegue
export const cognitoConfig = {
  region: 'us-east-1',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_PLACEHOLDER',
  clientId: process.env.REACT_APP_CLIENT_ID || 'PLACEHOLDER'
};

// Configurar AWS SDK
AWS.config.update({
  region: cognitoConfig.region
});

export const cognito = new AWS.CognitoIdentityServiceProvider();
