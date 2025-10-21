import json
import boto3
from PIL import Image
import io

s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        # Obtener información del evento S3
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = event['Records'][0]['s3']['object']['key']
        
        print(f"Procesando imagen: {key} en bucket: {bucket}")
        
        # Descargar la imagen desde S3
        response = s3.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        
        # Validar tamaño mínimo (100 KB)
        size_kb = len(image_data) / 1024
        if size_kb < 100:
            print(f"Imagen rechazada: tamaño {size_kb:.2f} KB < 100 KB")
            s3.delete_object(Bucket=bucket, Key=key)
            return {
                'statusCode': 400,
                'body': json.dumps(f'Imagen eliminada: tamaño insuficiente ({size_kb:.2f} KB)')
            }
        
        # Validar formato PNG
        try:
            image = Image.open(io.BytesIO(image_data))
            if image.format != 'PNG':
                print(f"Imagen rechazada: formato {image.format} != PNG")
                s3.delete_object(Bucket=bucket, Key=key)
                return {
                    'statusCode': 400,
                    'body': json.dumps(f'Imagen eliminada: formato inválido ({image.format})')
                }
        except Exception as e:
            print(f"Error al procesar imagen: {str(e)}")
            s3.delete_object(Bucket=bucket, Key=key)
            return {
                'statusCode': 400,
                'body': json.dumps(f'Imagen eliminada: archivo corrupto')
            }
        
        print(f"Imagen válida: {key} ({size_kb:.2f} KB, PNG)")
        return {
            'statusCode': 200,
            'body': json.dumps(f'Imagen válida: {key}')
        }
        
    except Exception as e:
        print(f"Error en Lambda: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error interno: {str(e)}')
        }
