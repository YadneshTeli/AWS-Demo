import json
import boto3

def lambda_handler(event, context):
    """Handle default/unknown routes"""
    connection_id = event['requestContext']['connectionId']
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    
    print(f"Default route triggered for connection: {connection_id}")
    
    # Initialize API Gateway Management API client
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=f'https://{domain_name}/{stage}'
    )
    
    # Send error message back to client
    error_message = json.dumps({
        'error': 'Invalid action',
        'message': 'Supported actions: sendmessage',
        'timestamp': context.aws_request_id
    })
    
    try:
        apigw_management.post_to_connection(
            Data=error_message,
            ConnectionId=connection_id
        )
    except Exception as e:
        print(f"Error sending default response: {e}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Default route processed')
    }
