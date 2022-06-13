import { aws_dynamodb, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoGetItem, DynamoAttributeValue, DynamoUpdateItem }  from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';


export class Ddb {
    public table: aws_dynamodb.Table;
    public getItem: DynamoGetItem;
    public updateItemTranslateText: DynamoUpdateItem;
    public updateItemPollyUrl: DynamoUpdateItem;

    constructor() { };

        public createDdb(scope: Construct, id: string, partitionName: string) {
            this.table = new aws_dynamodb.Table(scope, 'Create DynamoDB Table' , {
                tableName: id ,
                partitionKey: { name: partitionName, type: aws_dynamodb.AttributeType.STRING },
                billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
                removalPolicy: RemovalPolicy.DESTROY
            })
        }

        public getDdbItem(scope: Construct){
            this.getItem = new DynamoGetItem(scope, 'Get Ddb Item' , {
                key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.ArticleID')) },
                table: this.table ,
                consistentRead: false ,
            });
            return this.getItem;
        }

        public updateDdbItemTranslateText(scope: Construct){
            this.updateItemTranslateText = new DynamoUpdateItem(scope, 'Update Ddb Item for Translate Text' , {
                key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
                table: this.table ,
                expressionAttributeValues: {
                    ':EnglishVersionRef': DynamoAttributeValue.fromString(JsonPath.stringAt('$.Result.TranslatedText')),
                },
                    updateExpression: 'SET EnglishVersionRef = :EnglishVersionRef',
                });
            return this.updateItemTranslateText;
        }

        // Update DynamoDB for Translate Text on Step Functions
        public updateDdbItemPollyUrl(scope: Construct){
            this.updateItemPollyUrl = new DynamoUpdateItem(scope, 'Update Ddb Item for Speech' , {
                key: { ArticleID: DynamoAttributeValue.fromString(JsonPath.stringAt('$.Item.ArticleID.S')) },
                table: this.table ,
                expressionAttributeValues: {
                    ':S3URLRef': DynamoAttributeValue.fromString(JsonPath.stringAt('$.Result.SynthesisTask.OutputUri')),
                },
                    updateExpression: 'SET S3URLRef = :S3URLRef',
                    resultPath: '$.Result.SynthesisTask.OutputUri'
                });
            return this.updateItemPollyUrl;
        }
}