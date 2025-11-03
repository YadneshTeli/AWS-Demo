import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))

def lambda_handler(event, context):
    """Handle WebSocket disconnection event"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        # Remove connection from DynamoDB
        table.delete_item(
            Key={
                'connectionId': connection_id
            }
        )
        
        print(f"Connection removed: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Disconnected successfully')
        }
    except Exception as e:
        print(f"Error disconnecting: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
