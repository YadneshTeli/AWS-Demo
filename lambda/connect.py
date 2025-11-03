import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))

def lambda_handler(event, context):
    """
    Handles WebSocket $connect route
    Stores the connection ID in DynamoDB when a client connects
    """
    connection_id = event['requestContext']['connectionId']
    
    try:
        # Store connection in DynamoDB
        table.put_item(
            Item={
                'connectionId': connection_id,
                'timestamp': datetime.utcnow().isoformat(),
                'connectedAt': int(datetime.utcnow().timestamp())
            }
        )
        
        print(f"Connection established: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Connected successfully')
        }
    except Exception as e:
        print(f"Error connecting: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
