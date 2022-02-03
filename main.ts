import { Construct } from "constructs";
import { App, AssetType, TerraformAsset, TerraformOutput, TerraformStack } from "cdktf";
import {AwsProvider, s3, lambdafunction, iam, apigatewayv2} from "./.gen/providers/aws";
import path = require("path");

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, "aws", {
      region: "eu-west-1"
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

    const asset = new TerraformAsset(this, "lambda-asset", {
      path: path.resolve(__dirname, "./src"),
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });

    const assetBucket = new s3.S3Bucket(this, "bucket", {
      bucket: 'lambda-asset-bucket-pedram123123',
    });

    const lambdaArchive = new s3.S3BucketObject(this, "lambda-zip", {
      bucket: assetBucket.bucket,
      key: asset.fileName,
      source: asset.path,
    });

    const role = new iam.IamRole(this, "lambda-execution-role", {
      name: 'lambda-execution-role-pedram123123',
      assumeRolePolicy: JSON.stringify(lambdaRole)
    });

    new iam.IamRolePolicyAttachment(this, "lambda-managed-policy-attachment", {
      policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      role: role.name
    });

    const lambdaFunc = new lambdafunction.LambdaFunction(this, "lambdaFunc", {
      functionName: 'HelloLambda',
      s3Bucket: assetBucket.bucket,
      s3Key: lambdaArchive.key,
      handler: 'index.handler',
      runtime: 'nodejs14.x',
      role: role.arn
    });

    const api = new apigatewayv2.Apigatewayv2Api(this, "apig", {
      name: name,
      protocolType: "HTTP",
      target: lambdaFunc.arn
    });

    new lambdafunction.LambdaPermission(this, "apig-lambda", {
      functionName: lambdaFunc.functionName,
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      sourceArn: `${api.executionArn}/*/*`,
    });

    new TerraformOutput(this, 'output', {
      value: api.apiEndpoint
    });

  }
}

const app = new App();
new MyStack(app, "testcdk");
app.synth();