import json
import boto3
import os
from datetime import datetime
import uuid

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('TABLE_NAME', 'ActiveConnections'))
history_table = dynamodb.Table(os.environ.get('HISTORY_TABLE_NAME', 'MessageHistory'))

def lambda_handler(event, context):
    """Handle sending messages to all connected clients"""
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    # Parse incoming message
    try:
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '')
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps('Invalid JSON format')
        }
    
    if not message:
        return {
            'statusCode': 400,
            'body': json.dumps('Message is required')
        }
    
    # Generate message metadata
    message_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    try:
        # Save message to history
        history_table.put_item(
            Item={
                'messageId': message_id,
                'timestamp': timestamp,
                'connectionId': connection_id,
                'message': message
            }
        )
        
        # Get all active connections
        response = connections_table.scan()
        connections = response.get('Items', [])
        
        print(f"Broadcasting message to {len(connections)} connections")
        
        # Initialize API Gateway Management API client
        apigw_management = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=f'https://{domain_name}/{stage}'
        )
        
        # Format message for broadcasting
        formatted_message = json.dumps({
            'messageId': message_id,
            'timestamp': timestamp,
            'message': message,
            'connectionId': connection_id[:8] + '...'  # Truncate for privacy
        })
        
        # Broadcast to all connections
        failed_connections = []
        for conn in connections:
            try:
                apigw_management.post_to_connection(
                    Data=formatted_message,
                    ConnectionId=conn['connectionId']
                )
            except apigw_management.exceptions.GoneException:
                # Connection is stale, mark for removal
                print(f"Stale connection found: {conn['connectionId']}")
                failed_connections.append(conn['connectionId'])
            except Exception as e:
                print(f"Error sending to {conn['connectionId']}: {e}")
        
        # Remove stale connections
        for failed_conn in failed_connections:
            try:
                connections_table.delete_item(
                    Key={'connectionId': failed_conn}
                )
                print(f"Removed stale connection: {failed_conn}")
            except Exception as e:
                print(f"Error removing stale connection: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Message sent successfully',
                'messageId': message_id,
                'recipientCount': len(connections) - len(failed_connections)
            })
        }
        
    except Exception as e:
        print(f"Error processing message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
