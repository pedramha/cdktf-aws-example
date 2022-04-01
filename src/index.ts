
import * as AWS from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';

const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';


export const handler = async (event: any = {}): Promise<any> => {
    //post request
    if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body);
        const id = uuidv4();
        const params = {
            TableName: TABLE_NAME,
            Item: {
                [PRIMARY_KEY]: id,
                ...body
            }
        };
        await db.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({
                id
            })
        };
    }
    else if (event.httpMethod === 'GET') {
        const params = {
            TableName: TABLE_NAME
        };
        const data = await db.scan(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items)
        };
    }

    //delete request
    else if (event.httpMethod === 'DELETE') {
        const id = event.pathParameters.id;
        const params = {
            TableName: TABLE_NAME,
            Key: {
                [PRIMARY_KEY]: id
            }
        };
        await db.delete(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({
                id
            })
        };
    }

    //put request
    else if (event.httpMethod === 'PUT') {
        const id = event.pathParameters.id;
        const body = JSON.parse(event.body);
        const params = {
            TableName: TABLE_NAME,
            Key: {
                [PRIMARY_KEY]: id
            },
            UpdateExpression: 'set #name = :name',
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': body.name
            },
            ReturnValues: 'UPDATED_NEW'
        };
        await db.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({
                id
            })
        };
    }

}
