import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))

def lambda_handler(event, context):
    """Handle WebSocket connection event"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        # Save connection to DynamoDB
        table.put_item(
            Item={
                'connectionId': connection_id,
                'timestamp': datetime.utcnow().isoformat(),
                'connectedAt': str(context.get_remaining_time_in_millis())
            }
        )
        
        print(f"Connection established: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Connected successfully')
        }
    except Exception as e:
        print(f"Error connecting: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
