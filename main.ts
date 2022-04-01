import { Construct } from "constructs";
import { App, AssetType, TerraformAsset, TerraformOutput, TerraformStack } from "cdktf";
import {AwsProvider, s3, lambdafunction, iam, apigateway, dynamodb} from "./.gen/providers/aws";
import path = require("path");

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, "aws", {
      region: "eu-west-1"
    });

    const asset = new TerraformAsset(this, "lambda-asset", {
      path: path.resolve(__dirname, "./src"),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    const assetBucket = new s3.S3Bucket(this, "bucket", {
      bucket: 'lambda-asset-bucket-test1231234',
    });

    const lambdaArchive = new s3.S3BucketObject(this, "lambda-zip", {
      bucket: assetBucket.bucket,
      key: asset.fileName,
      source: asset.path,
      sourceHash: asset.assetHash
    });

    const db = new dynamodb.DynamodbTable(this, "table", {
      name: "table-test1231234",
      billingMode: "PAY_PER_REQUEST",
      hashKey: "id",
      attribute:[
        {
          name: "id",
          type: "S"
        }
      ]
    });

    const lambdaRole = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": "sts:AssumeRole",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Effect": "Allow",
          "Sid": ""
        }
      ]
    };
    const role = new iam.IamRole(this, "lambda-execution-role", {
      name: 'lambda-execution-role-test1231234',
      assumeRolePolicy: JSON.stringify(lambdaRole)
    });

    new iam.IamRolePolicyAttachment(this, "lambda-managed-policy-attachment", {
      policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      role: role.name
    });

    new iam.IamRolePolicyAttachment(this, "rolePolicyDB", {
      policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
      role: role.name
    });


    const lambdaFunc = new lambdafunction.LambdaFunction(this, "lambdaFunc", {
      functionName: 'HelloLambda',
      s3Bucket: assetBucket.bucket,
      s3Key: lambdaArchive.key,
      sourceCodeHash: lambdaArchive.sourceHash,
      handler: 'index.handler',
      runtime: 'nodejs14.x',
      role: role.arn,
      environment: {
        variables: {
          "TABLE_NAME": db.name,
          "PRIMARY_KEY": "id"
        }
      }
    });

    const api = new apigateway.ApiGatewayRestApi(this, "api", {
      name: "api-test1231234",
      description: "api-test1231234"
    });
    
    const resource = new apigateway.ApiGatewayResource(this, "resource", {
      restApiId: api.id,
      parentId: api.rootResourceId,
      pathPart: "resource"
    });

    const postApi = new apigateway.ApiGatewayMethod(this, "postApi", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: "POST",
      authorization: "NONE"
    });

    const getApi = new apigateway.ApiGatewayMethod(this, "getApi", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: "GET",
      authorization: "NONE"
    });

    const putApi = new apigateway.ApiGatewayMethod(this, "putApi", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: "PUT",
      authorization: "NONE"
    });

    const delApi = new apigateway.ApiGatewayMethod(this, "delApi", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: "DELETE",
      authorization: "NONE"
    });


    new apigateway.ApiGatewayIntegration(this, "integration1", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: getApi.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn,
    });


    new apigateway.ApiGatewayIntegration(this, "integration2", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: postApi.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn,
    });



    new apigateway.ApiGatewayIntegration(this, "integration3", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: delApi.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn,
    });



    new apigateway.ApiGatewayIntegration(this, "integration4", {
      restApiId: api.id,
      resourceId: resource.id,
      httpMethod: putApi.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunc.invokeArn,
    });


    const lambPermission=new lambdafunction.LambdaPermission(this, "apig-lambda", {
      functionName: lambdaFunc.functionName,
      statementId: "AllowExecutionFromApiGateway",
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      sourceArn: `${api.executionArn}/*/*`,
      dependsOn:[api]
    });

    const apiDep = new apigateway.ApiGatewayDeployment(this, "api-deployment", {
      restApiId: api.id,
      dependsOn: [lambPermission]
    });

    const apiStage = new apigateway.ApiGatewayStage(this, "api-stage", {
      restApiId: api.id,
      stageName: "prod",
      deploymentId: apiDep.id,
      dependsOn: [apiDep]
    });

    const apiKey = new apigateway.ApiGatewayApiKey(this, "api-key", {
      name: "api-key-test1231234",
      description: "api-key-test1231234",
      enabled: true
    });

    const usage = new apigateway.ApiGatewayUsagePlan(this, "usage-plan", {
      name: "usage-plan-test1231234",
      description: "usage-plan-test1231234",
      apiStages: [
        {
          apiId: api.id,
          stage: apiStage.stageName
        }
      ],
      throttleSettings: {
        burstLimit: 10,
        rateLimit: 10
      },
      dependsOn: [apiKey]
    });

    new apigateway.ApiGatewayUsagePlanKey(this, "usage-key", {
      keyId: apiKey.id,
      keyType:"API_KEY",
      usagePlanId: usage.id,
      dependsOn: [usage]
    });

    new TerraformOutput(this, "output", {
      value: apiStage.invokeUrl,
      description: "API URL"
    });

  }
}

const app = new App();
new MyStack(app, "testcdk");
app.synth();